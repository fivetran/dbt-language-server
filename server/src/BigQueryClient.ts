import { BigQuery } from '@google-cloud/bigquery';

export class BigQueryClient {
  bigQuery: BigQuery;

  constructor(keyFilename: string, projectId: string) {
    const options = {
      keyFilename: keyFilename,
      projectId: projectId,
    };
    this.bigQuery = new BigQuery(options);
    if (process.env.BIG_QUERY_URL) {
      this.bigQuery.baseUrl = process.env.BIG_QUERY_URL;
    }
  }

  async getDatasets() {
    return await this.bigQuery.getDatasets();
  }

  async getTableSchema(dataSet: string, tableName: string) {
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
