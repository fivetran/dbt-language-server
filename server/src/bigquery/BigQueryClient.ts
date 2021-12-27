import { DbtDestinationClient } from '../DbtDestinationClient';
import { BigQuery, DatasetsResponse } from '@google-cloud/bigquery';

export class BigQueryClient implements DbtDestinationClient {
  static readonly BQ_TEST_CLIENT_DATASETS_LIMIT = 1;

  _project: string;
  bigQuery: BigQuery;

  constructor(project: string, bigQuery: BigQuery) {
    this._project = project;
    this.bigQuery = bigQuery;
  }

  async test(): Promise<string | undefined> {
    try {
      await this.getDatasets(BigQueryClient.BQ_TEST_CLIENT_DATASETS_LIMIT);
    } catch (e: any) {
      const message = `Test connection failed. Reason: ${e.message}.`;
      console.log(message);
      return message;
    }

    return undefined;
  }

  get project(): string {
    return this._project;
  }

  async getDatasets(maxResults?: number): Promise<DatasetsResponse> {
    const options = maxResults
      ? {
          maxResults: maxResults,
        }
      : undefined;
    return await this.bigQuery.getDatasets(options);
  }

  async getTableSchema(dataSet: string, tableName: string): Promise<any> {
    const dataset = this.bigQuery.dataset(dataSet);
    const table = dataset.table(tableName);
    try {
      const metadata = await table.getMetadata();
      return metadata[0].schema;
    } catch (e: any) {
      console.log(e.message);
    }
  }
}
