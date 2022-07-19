import { Emitter } from 'vscode-languageserver';
import { Dbt } from './dbt_execution/Dbt';

export class DbtContext {
  dbtReady = false;
  onDbtReadyEmitter = new Emitter<void>();
  dbt?: Dbt;
}
