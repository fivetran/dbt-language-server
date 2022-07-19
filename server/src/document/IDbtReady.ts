import { Emitter } from 'vscode-languageserver';

export interface IDbtReady {
  dbtReady: boolean;
  onDbtReadyEmitter: Emitter<void>;
}
