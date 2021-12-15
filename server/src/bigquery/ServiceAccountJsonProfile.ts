import { DbtProfile, Client } from '../DbtProfile';
import { BigQueryClient } from './BigQueryClient';
import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { ExternalAccountClientOptions } from 'google-auth-library';

export class ServiceAccountJsonProfile implements DbtProfile {
  static readonly createProfile: () => DbtProfile = () => new ServiceAccountJsonProfile();

  static readonly BQ_SERVICE_ACCOUNT_JSON_DOCS =
    '[Service Account JSON configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json).';

  getDocsUrl(): string {
    return ServiceAccountJsonProfile.BQ_SERVICE_ACCOUNT_JSON_DOCS;
  }

  validateProfile(targetConfig: any): string | undefined {
    const project = targetConfig.project;
    if (!project) {
      return 'project';
    }

    const keyFileJson = targetConfig.keyFileJson;
    if (!keyFileJson) {
      return 'keyFileJson';
    }

    return this.validateKeyFileJson(keyFileJson);
  }

  createClient(profile: any): Client {
    const project = profile.project;
    const keyFileJson = JSON.stringify(profile.keyfile_json);

    const content = <ExternalAccountClientOptions>JSON.parse(keyFileJson);
    const options: BigQueryOptions = {
      projectId: project,
      credentials: content,
    };
    const bigQuery = new BigQuery(options);
    return new BigQueryClient(project, bigQuery);
  }

  authenticateClient(): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  private validateKeyFileJson(keyFileJson: any): string | undefined {
    const privateKey = keyFileJson.private_key;
    if (!privateKey) {
      return 'private_key';
    }
    return undefined;
  }
}
