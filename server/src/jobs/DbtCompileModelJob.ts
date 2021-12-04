import { DbtCompileJob } from './DbtCompileJob';
import { DbtServer } from '../DbtServer';

export class DbtCompileModelJob extends DbtCompileJob {
  modelName: string;

  constructor(dbtServer: DbtServer, modelName: string) {
    super(dbtServer);
    this.modelName = modelName;
  }

  async runCompile(): Promise<void> {
    this.startCompileResponse = await this.dbtServer.compileModel(this.requestId, this.modelName);
  }
}
