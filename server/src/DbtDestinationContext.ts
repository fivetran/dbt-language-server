import { Emitter } from 'vscode-languageserver';
import { BigQueryContext } from './bigquery/BigQueryContext';

export class DbtDestinationContext {
  contextInitialized = false;
  onContextInitializedEmitter = new Emitter<void>();
  bigQueryContext?: BigQueryContext;
}
