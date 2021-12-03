import { ProfileFactory } from '../../ProfileFactory';
import { ProfileDataExtractor } from '../../ProfileDataExtractor';
import { ServiceAccountDataExtractor } from './ServiceAccountDataExtractor';
import { Client } from '../../Client';
import { ProfileData } from '../../ProfileData';
import { ProfileValidator } from '../../ProfileValidator';
import { ServiceAccountValidator } from './ServiceAccountValidator';
import { ServiceAccountData } from './ServiceAccountData';
import { BigQueryClient } from '../BigQueryClient';
import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';

export class ServiceAccountFactory extends ProfileFactory {
  static readonly BQ_SERVICE_ACCOUNT_FILE_DOCS =
    '[Service Account File configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file).';

  getDocsUrl(): string {
    return ServiceAccountFactory.BQ_SERVICE_ACCOUNT_FILE_DOCS;
  }

  getProfileDataExtractor(): ProfileDataExtractor {
    return new ServiceAccountDataExtractor();
  }

  createClient(data: ProfileData): Client {
    const serviceAccountData = <ServiceAccountData>data;
    const options: BigQueryOptions = {
      projectId: serviceAccountData.project,
      keyFilename: serviceAccountData.keyFilePath,
    };
    const bigQuery = new BigQuery(options);
    return new BigQueryClient(serviceAccountData.project, bigQuery);
  }

  createValidator(): ProfileValidator {
    return new ServiceAccountValidator();
  }

  authenticateClient(): Promise<void> {
    return Promise.resolve();
  }
}
