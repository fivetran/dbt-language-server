import * as retry from 'async-retry';
import { err, ok, Result } from 'neverthrow';
import * as fs from 'node:fs';
import { DbtRepository } from '../DbtRepository';
import { wait } from '../utils/Utils';
import { DbtCompileJob } from './DbtCompileJob';
import { CompileResponse, DbtRpcClient, PollResponse } from './DbtRpcClient';

export class DbtRpcCompileJob extends DbtCompileJob {
  static readonly UNKNOWN_ERROR = 'Unknown dbt-rpc error';
  static readonly STOP_ERROR = 'Job was stopped';
  static readonly NETWORK_ERROR = 'Network error';
  static readonly JOB_IS_NOT_COMPLETED = 'Job is still not completed';

  static readonly DBT_COMPILATION_ERROR_CODE = 10_011;

  static GET_POLL_TOKEN_MAX_RETRIES = 6;
  static GET_POLL_TOKEN_TIMEOUT_MS = 200;

  static POLL_MAX_RETRIES_FOR_MODEL = 15;
  static POLL_MAX_RETRIES_FOR_PROJECT = 80;
  static POLL_TIMEOUT_MS = 1200;
  static MAX_RETRIES_FOR_UNKNOWN_ERROR = 5;

  private pollRequestToken?: string;
  private stopRequired = false;

  result?: Result<string, string>;

  /** If modelPath === undefined then we compile project */
  constructor(
    private modelPath: string | undefined,
    private dbtRepository: DbtRepository,
    private allowFallback: boolean,
    private dbtRpcClient: DbtRpcClient,
  ) {
    super();
  }

  async start(): Promise<Result<undefined, string>> {
    const pollTokenResult = await this.getPollToken();
    if (pollTokenResult.isErr()) {
      this.result = pollTokenResult;
      return err(pollTokenResult.error);
    }

    this.pollRequestToken = pollTokenResult.value;

    await wait(DbtRpcCompileJob.POLL_TIMEOUT_MS);

    const pollResponse = await this.getPollResponse(
      pollTokenResult.value,
      this.modelPath ? DbtRpcCompileJob.POLL_MAX_RETRIES_FOR_MODEL : DbtRpcCompileJob.POLL_MAX_RETRIES_FOR_PROJECT,
    );

    if (this.modelPath) {
      this.result = await this.getCompiledSqlOrError(this.modelPath, this.dbtRepository, pollResponse);
    }
    return pollResponse.isErr() ? err(pollResponse.error) : ok(undefined);
  }

  getResult(): Result<string, string> | undefined {
    return this.result;
  }

  async getPollToken(): Promise<Result<string, string>> {
    try {
      const startCompileResponse = await retry(
        async bail => {
          // Here dbt-rpc can be in compilation state after HUP signal and return an error
          const compileResponseAttempt = await this.dbtRpcClient.compile(this.modelPath);

          if (this.stopRequired) {
            bail(new Error(DbtRpcCompileJob.STOP_ERROR));
            return {} as unknown as CompileResponse; // We should explicitly return from here to avoid unnecessary retries: https://github.com/vercel/async-retry/issues/69
          }

          if (!compileResponseAttempt || compileResponseAttempt.error) {
            if (compileResponseAttempt?.error?.code === DbtRpcCompileJob.DBT_COMPILATION_ERROR_CODE) {
              // Do not retry dbt compile errors
              bail(new Error(compileResponseAttempt.error.data?.message));
              return {} as unknown as CompileResponse; // We should explicitly return from here to avoid unnecessary retries: https://github.com/vercel/async-retry/issues/69
            }

            throw new Error(compileResponseAttempt?.error?.data?.message ?? DbtRpcCompileJob.NETWORK_ERROR);
          }
          return compileResponseAttempt;
        },
        { factor: 1, retries: DbtRpcCompileJob.GET_POLL_TOKEN_MAX_RETRIES, minTimeout: DbtRpcCompileJob.GET_POLL_TOKEN_TIMEOUT_MS },
      );

      return ok(startCompileResponse.result.request_token);
    } catch (e) {
      return err(e instanceof Error ? DbtCompileJob.extractDbtError(e.message) : JSON.stringify(e));
    }
  }

  async getPollResponse(pollRequestToken: string, retries: number): Promise<Result<PollResponse, string>> {
    let connectionRetries = 0;
    try {
      const pollResponse = await retry(
        async bail => {
          const pollAttempt = await this.dbtRpcClient.pollOnceCompileResult(pollRequestToken);

          if (this.stopRequired) {
            bail(new Error(DbtRpcCompileJob.STOP_ERROR));
            return {} as unknown as PollResponse; // We should explicitly return from here to avoid unnecessary retries: https://github.com/vercel/async-retry/issues/69
          }

          const connectionError = !pollAttempt;
          if (connectionError) {
            connectionRetries++;
            if (connectionRetries > DbtRpcCompileJob.MAX_RETRIES_FOR_UNKNOWN_ERROR) {
              bail(new Error(DbtRpcCompileJob.NETWORK_ERROR));
              return {} as unknown as PollResponse; // We should explicitly return from here to avoid unnecessary retries: https://github.com/vercel/async-retry/issues/69
            }
            throw new Error(DbtRpcCompileJob.NETWORK_ERROR);
          }

          if (!pollAttempt.error && pollAttempt.result.state === 'running') {
            throw new Error(DbtRpcCompileJob.JOB_IS_NOT_COMPLETED);
          }

          return pollAttempt;
        },
        { factor: 1, retries, minTimeout: DbtRpcCompileJob.POLL_TIMEOUT_MS },
      );

      return ok(pollResponse);
    } catch (e) {
      return err(e instanceof Error ? e.message : JSON.stringify(e));
    }
  }

  async getCompiledSqlOrError(
    modelPath: string,
    dbtRepository: DbtRepository,
    pollResponse: Result<PollResponse, string>,
  ): Promise<Result<string, string>> {
    if (pollResponse.isErr()) {
      return err(pollResponse.error);
    }
    if (pollResponse.value.error) {
      return err(pollResponse.value.error.data?.message ? DbtCompileJob.extractDbtError(pollResponse.value.error.data.message) : 'Compilation error');
    }

    const compiledNodes = pollResponse.value.result.results;
    if (compiledNodes && compiledNodes.length > 0) {
      return ok(compiledNodes[0].node.compiled_sql);
    }
    if (pollResponse.value.result.state === 'success') {
      if (this.allowFallback) {
        // For some reason rpc server don't return compilation result for models with materialized='ephemeral'
        return ok(await DbtRpcCompileJob.fallbackForEphemeralModel(modelPath, dbtRepository));
      }
      return ok(DbtCompileJob.NO_RESULT_FROM_COMPILER);
    }
    return err("Couldn't find compiled sql");
  }

  async forceStop(): Promise<void> {
    this.stopRequired = true;
    await this.kill();
  }

  private async kill(): Promise<void> {
    if (this.pollRequestToken) {
      await this.dbtRpcClient.kill(this.pollRequestToken);
    }
  }

  private static async fallbackForEphemeralModel(modelPath: string, dbtRepository: DbtRepository): Promise<string> {
    console.log(`Use fallback for model ${modelPath}`);
    try {
      const resultPath = await DbtCompileJob.findCompiledFilePath(modelPath, dbtRepository);
      return fs.readFileSync(`${resultPath}`, 'utf8');
    } catch {
      return DbtCompileJob.NO_RESULT_FROM_COMPILER;
    }
  }
}
