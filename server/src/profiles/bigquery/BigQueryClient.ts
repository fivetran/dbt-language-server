import { Client } from '../Client';
import { BigQuery, DatasetsResponse } from '@google-cloud/bigquery';

export class BigQueryClient extends Client {
  _project: string;
  bigQuery: BigQuery;

  constructor(project: string, bigQuery: BigQuery) {
    super();
    this._project = project;
    this.bigQuery = bigQuery;
  }

  get project(): string {
    return this._project;
  }

  async getDatasets(): Promise<DatasetsResponse> {
    return await this.bigQuery.getDatasets();
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
