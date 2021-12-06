import { DbtProfile } from '../../DbtProfile';
import { ProfileData } from '../../ProfileData';
import { OAuthData } from './OAuthData';
import { Client } from '../../Client';
import { BigQueryClient } from '../BigQueryClient';
import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { ProcessExecutor } from '../../../ProcessExecutor';

export class OAuthProfile extends DbtProfile {
  static readonly BQ_OAUTH_DOCS =
    '[OAuth via gcloud configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-via-gcloud).';
  static processExecutor = new ProcessExecutor();

  getDocsUrl(): string {
    return OAuthProfile.BQ_OAUTH_DOCS;
  }

  getData(profile: any): ProfileData {
    const project = profile.project;
    return new OAuthData(project);
  }

  validateProfile(targetConfig: any): string | undefined {
    const project = targetConfig.project;
    if (!project) {
      return 'project';
    }

    return undefined;
  }

  createClient(data: ProfileData): Client {
    const oAuthData = <OAuthData>data;
    const options: BigQueryOptions = {
      projectId: oAuthData.project,
    };
    const bigQuery = new BigQuery(options);
    return new BigQueryClient(oAuthData.project, bigQuery);
  }

  async authenticateClient(): Promise<void> {
    try {
      const authenticateCommand =
        'gcloud auth application-default login --scopes=https://www.googleapis.com/auth/bigquery,https://www.googleapis.com/auth/iam.test';
      await OAuthProfile.processExecutor.execProcess(authenticateCommand);
    } catch (e) {
      console.log('Failed to find dbt command', e);
    }
  }
}
