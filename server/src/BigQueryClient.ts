import { BigQuery, DatasetsResponse, BigQueryOptions } from '@google-cloud/bigquery';
import { ExternalAccountClientOptions } from 'google-auth-library';
import { AuthenticationMethod, ServiceAccountCredentials, ServiceAccountJsonCredentials } from './YamlParser';

export class BigQueryClient {
  bigQuery: BigQuery;

  static buildClient(credentials: ServiceAccountCredentials | ServiceAccountJsonCredentials): BigQueryClient {
    let options: BigQueryOptions;

    switch (credentials.method) {
      case AuthenticationMethod.ServiceAccount: {
        options = BigQueryClient.buildServiceAccountOptions(<ServiceAccountCredentials>credentials);
        break;
      }
      case AuthenticationMethod.ServiceAccountJson: {
        options = BigQueryClient.buildServiceAccountJsonOptions(<ServiceAccountJsonCredentials>credentials);
        break;
      }
      default: {
        throw new Error(`No suitable client builder for specified authentication method: '${credentials.method}'.`);
      }
    }

    const bigQuery = new BigQuery(options);
    return new BigQueryClient(bigQuery);
  }

  private static buildServiceAccountOptions(credentials: ServiceAccountCredentials): BigQueryOptions {
    return {
      projectId: credentials.project,
      keyFilename: credentials.keyFilePath,
    };
  }

  private static buildServiceAccountJsonOptions(credentials: ServiceAccountJsonCredentials): BigQueryOptions {
    const content = <ExternalAccountClientOptions>JSON.parse(credentials.keyFileJson);
    return {
      projectId: credentials.project,
      credentials: content,
    };
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
      console.log('BigQueryClient error:' + e.message);
    }
  }
}
