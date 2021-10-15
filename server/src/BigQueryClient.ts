import { BigQuery, DatasetsResponse } from '@google-cloud/bigquery';

export class BigQueryClient {
  bigQuery: BigQuery;

  constructor(keyFilename: string, projectId: string) {
    const options = {
      keyFilename: keyFilename,
      projectId: projectId,
    };
    this.bigQuery = new BigQuery(options);
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
