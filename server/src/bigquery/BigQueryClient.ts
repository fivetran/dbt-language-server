import { BigQuery, DatasetsResponse, TableMetadata } from '@google-cloud/bigquery';
import { err, ok, Result } from 'neverthrow';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { SchemaDefinition } from '../TableDefinition';

export class BigQueryClient implements DbtDestinationClient {
  static readonly BQ_TEST_CLIENT_DATASETS_LIMIT = 1;

  project: string;
  bigQuery: BigQuery;

  constructor(project: string, bigQuery: BigQuery) {
    this.project = project;
    this.bigQuery = bigQuery;
  }

  async test(): Promise<Result<void, string>> {
    try {
      await this.getDatasets(BigQueryClient.BQ_TEST_CLIENT_DATASETS_LIMIT);
    } catch (e) {
      const message = `Test connection failed. Reason: ${e instanceof Error ? e.message : e}.`;
      console.log(message);
      return err(message);
    }

    return ok(undefined);
  }

  async getDatasets(maxResults?: number): Promise<DatasetsResponse> {
    return this.bigQuery.getDatasets({ maxResults });
  }

  async getTableSchema(dataSet: string, tableName: string): Promise<SchemaDefinition | undefined> {
    const dataset = this.bigQuery.dataset(dataSet);
    const table = dataset.table(tableName);
    try {
      const [metadata] = (await table.getMetadata()) as [TableMetadata, unknown];
      return metadata.schema as SchemaDefinition;
    } catch (e) {
      console.log(`error while getting table metadata: ${e instanceof Error ? e.message : e}`);
      return undefined;
    }
  }
}
