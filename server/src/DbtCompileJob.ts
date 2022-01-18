import { CompileResponse, DbtRpcClient, PollResponse } from './DbtRpcClient';

export class DbtCompileJob {
  static readonly MAX_RETRIES = 5;
  static readonly UNKNOWN_ERROR = 'Unknown dbt-rpc error';

  startCompileResponse: CompileResponse | undefined;
  tryCount = 0;

  constructor(private dbtRpcClient: DbtRpcClient, private modelName: string) {}

  async runCompile(): Promise<void> {
    this.startCompileResponse = await this.dbtRpcClient.compileModel(this.modelName);
    this.tryCount++;
  }

  async getResult(): Promise<PollResponse | undefined> {
    if (this.startCompileResponse && !this.startCompileResponse.error) {
      return this.dbtRpcClient.pollOnceCompileResult(this.startCompileResponse.result.request_token);
    }
    if (this.tryCount >= DbtCompileJob.MAX_RETRIES) {
      return {
        error: this.startCompileResponse?.error ?? { data: { message: DbtCompileJob.UNKNOWN_ERROR } },
        result: { state: 'error', elapsed: 0 },
      };
    }
    this.startCompileResponse = undefined;
    void this.runCompile();

    return undefined;
  }

  async kill(): Promise<void> {
    const token = this.startCompileResponse?.result.request_token;
    if (token) {
      await this.dbtRpcClient.kill(token);
    }
  }
}
