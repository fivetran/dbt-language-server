import { CompileResponse, DbtServer, PollResponse } from './DbtServer';

export class DbtCompileJob {
  readonly MAX_RETRIES = 5;

  dbtServer: DbtServer;
  text: string;
  pollRequestToken: string | undefined;
  startCompileRsponse: CompileResponse | undefined;
  tryCount = 0;

  constructor(dbtServer: DbtServer, text: string) {
    this.dbtServer = dbtServer;
    this.text = text;
  }

  async runCompile() {
    console.log('runCompile...');
    this.startCompileRsponse = await this.dbtServer.compileSql(this.text);
    console.log('runCompile...response');
  }

  async getResult(): Promise<PollResponse | undefined> {
    if (this.startCompileRsponse) {
      if (!this.startCompileRsponse.error) {
        return await this.dbtServer.pollOnceCompileResult(this.startCompileRsponse.result.request_token);
      } else {
        if (this.tryCount >= this.MAX_RETRIES) {
          return <PollResponse>{
            error: this.startCompileRsponse.error,
            result: { state: 'error' },
          };
        }
        this.startCompileRsponse = undefined;
        this.runCompile();
      }
      this.tryCount++;
    }
  }

  async kill() {
    if (this.pollRequestToken) {
      await this.dbtServer.kill(this.pollRequestToken);
    }
  }
}
