import { CompileResponse, DbtServer, PollResponse } from '../DbtServer';
import { v4 as uuid } from 'uuid';

export abstract class DbtCompileJob {
  static readonly MAX_RETRIES = 5;

  dbtServer: DbtServer;
  requestId: string;
  startCompileResponse: CompileResponse | undefined;
  tryCount = 0;

  constructor(dbtServer: DbtServer) {
    this.dbtServer = dbtServer;
    this.requestId = uuid();
  }

  abstract runCompile(): Promise<void>;

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
