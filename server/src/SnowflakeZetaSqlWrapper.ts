import { TableDefinition } from './TableDefinition';
import { ZetaSqlWrapper } from './ZetaSqlWrapper';

export class SnowflakeZetaSqlWrapper extends ZetaSqlWrapper {
  override createTableDefinition(namePath: string[]): TableDefinition {
    return new TableDefinition(namePath.map(n => n.toLowerCase()));
  }
}
