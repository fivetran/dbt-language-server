import { Emitter } from 'vscode-languageserver';
import { BigQueryContext } from './bigquery/BigQueryContext';

export class DestinationState {
  contextInitialized = false;
  onContextInitializedEmitter = new Emitter<void>();
  bigQueryContext?: BigQueryContext;
}
