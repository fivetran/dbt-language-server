import { ResolvedOutputColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedOutputColumnProto';
import { SimpleColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleColumnProto';
import { DbtDestinationClient } from './DbtDestinationClient';
import { TableDefinition } from './TableDefinition';
import { ZetaSqlApi } from './ZetaSqlApi';
import { createSimpleColumn } from './utils/ZetaSqlUtils';

interface TableInformation {
  columns?: SimpleColumnProto[];
  timePartitioning: boolean;
  external: boolean; // BQ: https://cloud.google.com/bigquery/docs/external-tables
}
export class TableFetcher {
  private tables: Map<string, Promise<TableInformation | undefined>> = new Map();

  constructor(
    private client: DbtDestinationClient,
    private zetaSqlApi: ZetaSqlApi,
  ) {}

  fetchTable(table: TableDefinition): Promise<TableInformation | undefined> {
    const key = `${table.getDataSetName() ?? 'undefined'}.${table.getTableName()}`;
    let promise = this.tables.get(key);
    if (promise === undefined) {
      promise = this.fillTableSchemaFromApiCallResult(table);
      this.tables.set(key, promise);
    }
    return promise;
  }

  private async fillTableSchemaFromApiCallResult(table: TableDefinition): Promise<TableInformation | undefined> {
    if (table.containsInformationSchema()) {
      return undefined;
    }

    const dataSetName = table.getDataSetName();
    const tableName = table.getTableName();

    if (dataSetName && tableName) {
      const metadata = await this.client.getTableMetadata(dataSetName, tableName);
      if (metadata) {
        return {
          columns: metadata.schema.fields.map<ResolvedOutputColumnProto>(f => createSimpleColumn(f.name, this.zetaSqlApi.createType(f))),
          timePartitioning: metadata.timePartitioning,
          external: metadata.type === 'EXTERNAL',
        };
      }
    }
    return undefined;
  }
}
