import { ProfileFactory } from '../../ProfileFactory';
import { ProfileDataExtractor } from '../../ProfileDataExtractor';
import { OAuthDataExtractor } from './OAuthDataExtractor';
import { Client } from '../../Client';
import { ProfileData } from '../../ProfileData';
import { ProfileValidator } from '../../ProfileValidator';
import { OAuthValidator } from './OAuthValidator';
import { OAuthData } from './OAuthData';
import { BigQueryClient } from '../BigQueryClient';
import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { ProcessExecutor } from '../../../ProcessExecutor';

export class OAuthFactory extends ProfileFactory {
  static readonly BQ_OAUTH_DOCS =
    '[OAuth via gcloud configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-via-gcloud).';
  static processExecutor = new ProcessExecutor();

  getDocsUrl(): string {
    return OAuthFactory.BQ_OAUTH_DOCS;
  }

  getProfileDataExtractor(): ProfileDataExtractor {
    return new OAuthDataExtractor();
  }

  createClient(data: ProfileData): Client {
    const oAuthData = <OAuthData>data;
    const options: BigQueryOptions = {
      projectId: oAuthData.project,
    };
    const bigQuery = new BigQuery(options);
    return new BigQueryClient(oAuthData.project, bigQuery);
  }

  createValidator(): ProfileValidator {
    return new OAuthValidator();
  }

  async authenticateClient(): Promise<void> {
    try {
      const authenticateCommand =
        'gcloud auth application-default login --scopes=https://www.googleapis.com/auth/bigquery,https://www.googleapis.com/auth/iam.test';
      await OAuthFactory.processExecutor.execProcess(authenticateCommand);
    } catch (e) {
      console.log('Failed to find dbt command', e);
    }
  }
}
