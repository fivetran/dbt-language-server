import { BigQuery, DatasetsResponse } from '@google-cloud/bigquery';
import { err, ok, Result } from 'neverthrow';
import { DbtDestinationClient } from '../DbtDestinationClient';

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
    } catch (e: any) {
      const message = `Test connection failed. Reason: ${e.message}.`;
      console.log(message);
      return err(message);
    }

    return ok(undefined);
  }

  async getDatasets(maxResults?: number): Promise<DatasetsResponse> {
    return this.bigQuery.getDatasets({ maxResults });
  }

  async getTableSchema(dataSet: string, tableName: string): Promise<any> {
    const dataset = this.bigQuery.dataset(dataSet);
    const table = dataset.table(tableName);
    try {
      const metadata = await table.getMetadata();
      return metadata[0].schema;
    } catch (e: any) {
      console.log(e.message);
      return undefined;
    }
  }
}
