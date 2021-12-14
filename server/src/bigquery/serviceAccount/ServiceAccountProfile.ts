import { DbtProfile, ProfileData, Client } from '../../DbtProfile';
import { ServiceAccountData } from './ServiceAccountData';
import { YamlParserUtils } from '../../YamlParserUtils';
import { BigQueryClient } from '../BigQueryClient';
import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';

export class ServiceAccountProfile implements DbtProfile {
  static readonly createProfile: () => DbtProfile = () => new ServiceAccountProfile();

  static readonly BQ_SERVICE_ACCOUNT_FILE_DOCS =
    '[Service Account File configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file).';

  getDocsUrl(): string {
    return ServiceAccountProfile.BQ_SERVICE_ACCOUNT_FILE_DOCS;
  }

  getData(profile: any): ProfileData {
    const project = profile.project;
    const keyFilePath = YamlParserUtils.replaceTilde(profile.keyfile);
    return new ServiceAccountData(project, keyFilePath);
  }

  validateProfile(targetConfig: any): string | undefined {
    const project = targetConfig.project;
    if (!project) {
      return 'project';
    }

    const keyFilePath = targetConfig.keyfile;
    if (!keyFilePath) {
      return 'keyfile';
    }

    return undefined;
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

  authenticateClient(): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }
}
