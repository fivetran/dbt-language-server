import { ResolvedOutputColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedOutputColumnProto';
import { SimpleColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleColumnProto';
import { BigQueryClient } from './bigquery/BigQueryClient';
import { TableDefinition } from './TableDefinition';
import { createSimpleColumn, createType } from './utils/ZetaSqlUtils';

export interface TableInformation {
  columns?: SimpleColumnProto[];
  timePartitioning: boolean;
}
export class BigQueryTableFetcher {
  private tables: Map<string, Promise<TableInformation | undefined>> = new Map();

  constructor(private bigQueryClient: BigQueryClient) {}

  fetchTable(table: TableDefinition): Promise<TableInformation | undefined> {
    const key = `${table.getDataSetName() ?? 'undefined'}.${table.getTableName()}`;
    let promise = this.tables.get(key);
    if (promise === undefined) {
      promise = this.fillTableSchemaFromBq(table);
      this.tables.set(key, promise);
    }
    return promise;
  }

  private async fillTableSchemaFromBq(table: TableDefinition): Promise<TableInformation | undefined> {
    if (table.containsInformationSchema()) {
      return undefined;
    }

    const dataSetName = table.getDataSetName();
    const tableName = table.getTableName();

    if (dataSetName && tableName) {
      const metadata = await this.bigQueryClient.getTableMetadata(dataSetName, tableName);
      if (metadata) {
        return {
          columns: metadata.schema.fields.map<ResolvedOutputColumnProto>(f => createSimpleColumn(f.name, createType(f))),
          timePartitioning: metadata.timePartitioning,
        };
      }
    }
    return undefined;
  }
}
