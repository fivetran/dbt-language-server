import { Emitter } from 'vscode-languageserver';
import { Dbt } from './dbt_execution/Dbt';

export class DbtContext {
  dbtReady = false;
  onDbtReadyEmitter = new Emitter<void>();
  dbt?: Dbt;

  async prepare(dbtProfileType?: string): Promise<void> {
    await this.dbt?.prepare(dbtProfileType);
    this.dbtReady = true;
    this.onDbtReadyEmitter.fire();
  }

  refresh(): void {
    this.dbt?.refresh();
  }

  dispose(): void {
    this.dbt?.dispose();
  }
}
