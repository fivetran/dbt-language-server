import { ProfileFactory } from '../../ProfileFactory';
import { ProfileDataExtractor } from '../../ProfileDataExtractor';
import { ServiceAccountJsonDataExtractor } from './ServiceAccountJsonDataExtractor';
import { Client } from '../../Client';
import { ProfileData } from '../../ProfileData';
import { ProfileValidator } from '../../ProfileValidator';
import { ServiceAccountJsonValidator } from './ServiceAccountJsonValidator';
import { ServiceAccountJsonData } from './ServiceAccountJsonData';
import { BigQueryClient } from '../BigQueryClient';
import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { ExternalAccountClientOptions } from 'google-auth-library';

export class ServiceAccountJsonFactory extends ProfileFactory {
  static readonly BQ_SERVICE_ACCOUNT_JSON_DOCS =
    '[Service Account JSON configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json).';

  getDocsUrl(): string {
    return ServiceAccountJsonFactory.BQ_SERVICE_ACCOUNT_JSON_DOCS;
  }

  getProfileDataExtractor(): ProfileDataExtractor {
    return new ServiceAccountJsonDataExtractor();
  }

  createClient(data: ProfileData): Client {
    const serviceAccountJsonData = <ServiceAccountJsonData>data;
    const content = <ExternalAccountClientOptions>JSON.parse(serviceAccountJsonData.keyFileJson);
    const options: BigQueryOptions = {
      projectId: serviceAccountJsonData.project,
      credentials: content,
    };
    const bigQuery = new BigQuery(options);
    return new BigQueryClient(serviceAccountJsonData.project, bigQuery);
  }

  createValidator(): ProfileValidator {
    return new ServiceAccountJsonValidator();
  }

  authenticateClient(): Promise<void> {
    return Promise.resolve();
  }
}
