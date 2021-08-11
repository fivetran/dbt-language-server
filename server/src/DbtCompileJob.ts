import { CompileResponse, DbtServer } from './DbtServer';

export class DbtCompileJob {
  dbtServer: DbtServer;
  text: string;
  pollRequestToken: string | undefined;
  startCompileRsponse: CompileResponse | undefined;

  constructor(dbtServer: DbtServer, text: string) {
    this.dbtServer = dbtServer;
    this.text = text;
  }

  async runCompile() {
    console.log('runCompile...');
    this.startCompileRsponse = await this.dbtServer.compileSql(this.text);
    console.log('runCompile...response');
  }

  async getResult() {
    if (this.startCompileRsponse) {
      if (!this.startCompileRsponse.error) {
        return await this.dbtServer.pollOnceCompileResult(this.startCompileRsponse.result.request_token);
      } else {
        this.startCompileRsponse = undefined;
        this.runCompile();
      }
    }
  }

  async kill() {
    if (this.pollRequestToken) {
      await this.dbtServer.kill(this.pollRequestToken);
    }
  }
}
