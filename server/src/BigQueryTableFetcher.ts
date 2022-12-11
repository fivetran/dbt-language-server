import { ResolvedOutputColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedOutputColumnProto';
import { BigQueryClient } from './bigquery/BigQueryClient';
import { TableDefinition } from './TableDefinition';
import { createSimpleColumn, createType } from './utils/ZetaSqlUtils';

export class BigQueryTableFetcher {
  tables: Map<string, Promise<TableDefinition>> = new Map();

  constructor(private bigQueryClient: BigQueryClient) {}

  fetchTable(table: TableDefinition): Promise<TableDefinition> {
    const key = table.namePath.join('.');
    let promise = this.tables.get(key);
    if (promise === undefined) {
      promise = this.fillTableSchemaFromBq(table);
      this.tables.set(key, promise);
    }
    return promise;
  }

  async fillTableSchemaFromBq(table: TableDefinition): Promise<TableDefinition> {
    if (table.containsInformationSchema()) {
      return table;
    }

    const dataSetName = table.getDataSetName();
    const tableName = table.getTableName();

    if (dataSetName && tableName) {
      const metadata = await this.bigQueryClient.getTableMetadata(dataSetName, tableName);
      if (metadata) {
        table.columns = metadata.schema.fields.map<ResolvedOutputColumnProto>(f => createSimpleColumn(f.name, createType(f)));
        table.timePartitioning = metadata.timePartitioning;
      }
    }
    return table;
  }
}
