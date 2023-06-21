import { TableDefinition } from './TableDefinition';
import { ZetaSqlWrapper } from './ZetaSqlWrapper';

export class BigQueryZetaSqlWrapper extends ZetaSqlWrapper {
  override createTableDefinition(namePath: string[]): TableDefinition {
    return new TableDefinition(namePath);
  }
}
