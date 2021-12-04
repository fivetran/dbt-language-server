import { DbtCompileJob } from './DbtCompileJob';
import { DbtServer } from '../DbtServer';

export class DbtCompileSqlJob extends DbtCompileJob {
  sql: string;

  constructor(dbtServer: DbtServer, sql: string) {
    super(dbtServer);
    this.sql = sql;
  }

  async runCompile(): Promise<void> {
    this.startCompileResponse = await this.dbtServer.compileSql(this.requestId, this.sql);
  }
}
