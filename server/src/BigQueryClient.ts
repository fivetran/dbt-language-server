import { BigQuery, DatasetsResponse, BigQueryOptions } from '@google-cloud/bigquery';
import { ExternalAccountClientOptions } from 'google-auth-library';
import { AuthenticationMethod, ServiceAccountCredentials, ServiceAccountJsonCredentials } from './YamlParser';

export class BigQueryClient {
  bigQuery: BigQuery;

  static buildClient(credentials: ServiceAccountCredentials | ServiceAccountJsonCredentials): BigQueryClient | undefined {
    switch (credentials.method) {
      case AuthenticationMethod.ServiceAccount: {
        return BigQueryClient.buildServiceAccountClient(<ServiceAccountCredentials>credentials);
      }
      case AuthenticationMethod.ServiceAccountJson: {
        return BigQueryClient.buildServiceAccountJsonClient(<ServiceAccountJsonCredentials>credentials);
      }
      default: {
        throw new Error(`No suitable client builder for specified authentication method: '${credentials.method}'.`);
      }
    }
  }

  private static buildServiceAccountClient(credentials: ServiceAccountCredentials): BigQueryClient {
    const options = {
      projectId: credentials.project,
      keyFilename: credentials.keyFilePath,
    };
    const bigQuery = new BigQuery(options);
    return new BigQueryClient(bigQuery);
  }

  private static buildServiceAccountJsonClient(credentials: ServiceAccountJsonCredentials): BigQueryClient {
    const content = <ExternalAccountClientOptions>JSON.parse(credentials.keyFileJson);
    const options: BigQueryOptions = {
      projectId: credentials.project,
      credentials: content,
    };
    const bigQuery = new BigQuery(options);
    return new BigQueryClient(bigQuery);
  }

  constructor(bigQuery: BigQuery) {
    this.bigQuery = bigQuery;
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
