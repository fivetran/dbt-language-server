import { err, ok, Result } from 'neverthrow';
import { DbtCompileJob } from './DbtCompileJob';
import { CompileResponse, DbtRpcClient, PollResponse } from './DbtRpcClient';
import retry = require('async-retry');

export class DbtRpcCompileJob implements DbtCompileJob {
  static readonly UNKNOWN_ERROR = 'Unknown dbt-rpc error';
  static readonly STOP_ERROR = 'Job was stopped';
  static readonly NETWORK_ERROR = 'Network error';

  static COMPILE_MODEL_MAX_RETRIES = 6;
  static COMPILE_MODEL_TIMEOUT_MS = 100;

  static POLL_MAX_RETRIES = 86;
  static POLL_TIMEOUT_MS = 700;
  static MAX_RETRIES_FOR_UNKNOWN_ERROR = 5;

  private pollRequestToken?: string;
  private stopRequired = false;

  result?: Result<string, string>;

  constructor(private dbtRpcClient: DbtRpcClient, private modelName: string) {}

  async start(): Promise<void> {
    const pollTokenResult = await this.getPollToken();
    if (pollTokenResult.isErr()) {
      this.result = pollTokenResult;
      return;
    }

    this.pollRequestToken = pollTokenResult.value;

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
          const compileResponseAttempt = await this.dbtRpcClient.compile(this.modelName);

          if (this.stopRequired) {
            bail(new Error(DbtRpcCompileJob.STOP_ERROR));
            return {} as unknown as CompileResponse; // We should explicitly return from here to avoid unnecessary retries: https://github.com/vercel/async-retry/issues/69
          }

          if (!compileResponseAttempt || compileResponseAttempt.error) {
            throw new Error(compileResponseAttempt?.error?.data?.message ?? DbtRpcCompileJob.NETWORK_ERROR);
          }
          return compileResponseAttempt;
        },
        { factor: 1, retries: DbtRpcCompileJob.COMPILE_MODEL_MAX_RETRIES, minTimeout: DbtRpcCompileJob.COMPILE_MODEL_TIMEOUT_MS },
      );

      return ok(startCompileResponse.result.request_token);
    } catch (e) {
      return err(e instanceof Error ? e.message : JSON.stringify(e));
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

          const stillRunning = !pollAttempt.error && pollAttempt.result.state === 'running';
          if (stillRunning) {
            throw new Error('Job is still not completed');
          }

          return pollAttempt;
        },
        { factor: 1, retries: DbtRpcCompileJob.POLL_MAX_RETRIES, minTimeout: DbtRpcCompileJob.POLL_TIMEOUT_MS },
      );

      if (pollResponse.error) {
        return err(pollResponse.error.data?.message ?? 'Compilation error');
      }

      const compiledSql = this.getCompiledSql(pollResponse);
      return compiledSql === undefined ? err("Couldn't find compiled sql") : ok(compiledSql);
    } catch (e) {
      return err(e instanceof Error ? e.message : JSON.stringify(e));
    }
  }

  getCompiledSql(pollResponse: PollResponse): string | undefined {
    const compiledNodes = pollResponse.result.results;
    if (compiledNodes && compiledNodes.length > 0) {
      return compiledNodes[0].node.compiled_sql;
    }
    if (pollResponse.result.state === 'success') {
      return ' ';
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
}
