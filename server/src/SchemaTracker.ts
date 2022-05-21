import { BigQueryClient } from './bigquery/BigQueryClient';
import { TableDefinition } from './TableDefinition';
import { ZetaSqlWrapper } from './ZetaSqlWrapper';

export class SchemaTracker {
  tableDefinitions: TableDefinition[] = [];
  hasNewTables = false;

  constructor(private bigQueryClient: BigQueryClient, private zetaSqlWrapper: ZetaSqlWrapper) {}

  resetHasNewTables(): void {
    this.hasNewTables = false;
  }

  async findTableNames(sql: string): Promise<TableDefinition[] | undefined> {
    try {
      const extractResult = await this.zetaSqlWrapper.extractTableNamesFromStatement(sql);
      return extractResult.tableName.map(t => new TableDefinition(t.tableNameSegment));
    } catch (e) {
      console.log(e);
    }
    return undefined;
  }

  async refreshTableNames(sql: string): Promise<void> {
    const tableDefinitions = await this.findTableNames(sql);
    if (!tableDefinitions) {
      return;
    }

    const newTables = tableDefinitions.filter(
      newTable => !this.tableDefinitions.find(oldTable => this.arraysAreEqual(oldTable.name, newTable.name) && oldTable.rawName === newTable.rawName),
    );

    if (newTables.length > 0) {
      for (const table of newTables) {
        if (table.getDatasetName() && table.getTableName()) {
          const metadata = await this.bigQueryClient.getTableMetadata(table.getDatasetName(), table.getTableName());
          if (metadata) {
            this.tableDefinitions.push(table);
            table.schema = metadata.schema;
            table.timePartitioning = metadata.timePartitioning;
          }
        }
      }
      this.hasNewTables = true;
    }
  }

  arraysAreEqual(a1: string[], a2: string[]): boolean {
    return a1.length === a2.length && a1.every((value, index) => value === a2[index]);
  }
}
