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

  static readonly NO_RESULT_FROM_COMPILER = ' ';

  static readonly DBT_COMPILATION_ERROR_CODE = 10_011;

  static COMPILE_MODEL_MAX_RETRIES = 6;
  static COMPILE_MODEL_TIMEOUT_MS = 100;

  static POLL_MAX_RETRIES = 15;
  static POLL_TIMEOUT_MS = 1200;
  static MAX_RETRIES_FOR_UNKNOWN_ERROR = 5;

  private pollRequestToken?: string;
  private stopRequired = false;

  result?: Result<string, string>;

  constructor(
    modelPath: string,
    dbtRepository: DbtRepository,
    private dbtRpcClient: DbtRpcClient,
    // For empty models we don't use fallback
    private allowFallback: boolean,
  ) {
    super(modelPath, dbtRepository);
  }

  async start(): Promise<void> {
    const pollTokenResult = await this.getPollToken();
    if (pollTokenResult.isErr()) {
      this.result = pollTokenResult;
      return;
    }

    this.pollRequestToken = pollTokenResult.value;

    await wait(DbtRpcCompileJob.POLL_TIMEOUT_MS);

    this.result = await this.getPollResponse(pollTokenResult.value);
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
        { factor: 1, retries: DbtRpcCompileJob.COMPILE_MODEL_MAX_RETRIES, minTimeout: DbtRpcCompileJob.COMPILE_MODEL_TIMEOUT_MS },
      );

      return ok(startCompileResponse.result.request_token);
    } catch (e) {
      return err(e instanceof Error ? this.extractDbtError(e.message) : JSON.stringify(e));
    }
  }

  async getPollResponse(pollRequestToken: string): Promise<Result<string, string>> {
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
        { factor: 1, retries: DbtRpcCompileJob.POLL_MAX_RETRIES, minTimeout: DbtRpcCompileJob.POLL_TIMEOUT_MS },
      );

      if (pollResponse.error) {
        return err(pollResponse.error.data?.message ? this.extractDbtError(pollResponse.error.data.message) : 'Compilation error');
      }

      const compiledSql = await this.getCompiledSql(pollResponse);
      return compiledSql === undefined ? err("Couldn't find compiled sql") : ok(compiledSql);
    } catch (e) {
      return err(e instanceof Error ? e.message : JSON.stringify(e));
    }
  }

  async getCompiledSql(pollResponse: PollResponse): Promise<string | undefined> {
    const compiledNodes = pollResponse.result.results;
    if (compiledNodes && compiledNodes.length > 0) {
      return compiledNodes[0].node.compiled_sql;
    }
    if (pollResponse.result.state === 'success') {
      if (this.allowFallback) {
        // For some reason rpc server don't return compilation result for models with materialized='ephemeral'
        return this.fallbackForEphemeralModel();
      }
      return DbtRpcCompileJob.NO_RESULT_FROM_COMPILER;
    }
    return undefined;
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

  private async fallbackForEphemeralModel(): Promise<string> {
    console.log(`Use fallback for ephemeral model ${this.modelPath}`);
    try {
      const resultPath = await this.findCompiledFilePath();
      return fs.readFileSync(`${resultPath}`, 'utf8');
    } catch {
      return DbtRpcCompileJob.NO_RESULT_FROM_COMPILER;
    }
  }
}
