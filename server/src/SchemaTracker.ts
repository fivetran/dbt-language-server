import { ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { ExtractTableNamesFromStatementRequest } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementRequest';
import { BigQueryClient } from './BigQueryClient';
import { TableDefinition } from './TableDefinition';
import { ServiceAccountCreds, YamlParser } from './YamlParser';

export class SchemaTracker {
  tableDefinitions: TableDefinition[] = [];
  serviceAccountCreds: ServiceAccountCreds | undefined;
  hasNewTables = false;

  constructor() {
    this.serviceAccountCreds = new YamlParser().findProfileCreds();
  }

  resetHasNewTables() {
    this.hasNewTables = false;
  }

  async findTableNames(sql: string) {
    const request: ExtractTableNamesFromStatementRequest = {
      sqlStatement: sql,
    };
    try {
      const extractResult = await ZetaSQLClient.INSTANCE.extractTableNamesFromStatement(request);
      return extractResult.tableName.map(t => new TableDefinition(t.tableNameSegment));
    } catch (e) {
      console.log(e);
    }
  }

  async refreshTableNames(sql: string) {
    const tableDefinitions = await this.findTableNames(sql);
    if (!tableDefinitions) {
      return;
    }

    const newTables = tableDefinitions.filter(
      newTable => !this.tableDefinitions.find(oldTable => this.arraysAreEqual(oldTable.name, newTable.name) && oldTable.rawName === newTable.rawName),
    );

    if (newTables.length > 0 && this.serviceAccountCreds) {
      const bigQueryClient = new BigQueryClient(this.serviceAccountCreds.keyFile, this.serviceAccountCreds.project);
      for (const table of newTables) {
        // TODO: handle different project names?
        const schema = await bigQueryClient?.getTableSchema(table.getDatasetName(), table.getTableName());
        table.schema = schema;
        this.tableDefinitions.push(table);
      }
      this.hasNewTables = true;
    }
  }

  arraysAreEqual(a1: string[], a2: string[]) {
    return a1.length === a2.length && a1.every((value, index) => value === a2[index]);
  }
}
