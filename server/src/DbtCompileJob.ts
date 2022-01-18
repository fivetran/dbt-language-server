import { CompileResponse, DbtServer, PollResponse } from './DbtServer';

export class DbtCompileJob {
  static readonly MAX_RETRIES = 5;

  dbtServer: DbtServer;
  modelName: string;

  startCompileResponse: CompileResponse | undefined;
  tryCount = 0;

  constructor(dbtServer: DbtServer, modelName: string) {
    this.dbtServer = dbtServer;
    this.modelName = modelName;
  }

  async runCompile(): Promise<void> {
    this.startCompileResponse = await this.dbtServer.compileModel(this.modelName);
  }

  async getResult(): Promise<PollResponse | undefined> {
    if (this.startCompileResponse) {
      if (!this.startCompileResponse.error) {
        try {
          return await this.dbtServer.pollOnceCompileResult(this.startCompileResponse.result.request_token);
        } catch (e) {
          console.log(`Error while polling task result: ${JSON.stringify(e)}`);
        }
      } else {
        if (this.tryCount >= DbtCompileJob.MAX_RETRIES) {
          return {
            error: this.startCompileResponse.error,
            result: { state: 'error', elapsed: 0 },
          };
        }
        this.startCompileResponse = undefined;
        void this.runCompile();
      }
      this.tryCount++;
    }
    return undefined;
  }

  async kill(): Promise<void> {
    const token = this.startCompileResponse?.result.request_token;
    if (token) {
      await this.dbtServer.kill(token);
    }
  }
}
