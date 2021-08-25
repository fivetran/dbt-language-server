import { Dataset } from '@google-cloud/bigquery';
import { BigQueryClient } from './BigQueryClient';
import { ServiceAccountCreds } from './YamlParser';

export class DestinationDefinition {
  serviceAccountCreds: ServiceAccountCreds;
  project: string | undefined;
  datasets: Dataset[] | undefined;

  constructor(serviceAccountCreds: ServiceAccountCreds) {
    this.serviceAccountCreds = serviceAccountCreds;
    this.project = this.serviceAccountCreds.project;
    const client = new BigQueryClient(this.serviceAccountCreds.keyFile, this.serviceAccountCreds.project);
    client.getDatasets().then(datasetsResponse => {
      [this.datasets] = datasetsResponse;
    });
  }
}
