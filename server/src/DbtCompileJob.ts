import { CompileResponse, DbtServer, PollResponse } from './DbtServer';
import { v4 as uuid } from 'uuid';

export class DbtCompileJob {
  static readonly MAX_RETRIES = 5;

  dbtServer: DbtServer;
  modelName: string;

  requestId: string;
  startCompileResponse: CompileResponse | undefined;
  tryCount = 0;

  constructor(dbtServer: DbtServer, modelName: string) {
    this.dbtServer = dbtServer;
    this.modelName = modelName;
    this.requestId = uuid();
  }

  async runCompile(): Promise<void> {
    this.startCompileResponse = await this.dbtServer.compileModel(this.requestId, this.modelName);
  }

  async getResult(): Promise<PollResponse | undefined> {
    if (this.startCompileResponse) {
      if (!this.startCompileResponse.error) {
        return await this.dbtServer.pollOnceCompileResult(this.requestId, this.startCompileResponse.result.request_token);
      } else {
        if (this.tryCount >= DbtCompileJob.MAX_RETRIES) {
          return <PollResponse>{
            error: this.startCompileResponse.error,
            result: { state: 'error' },
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
