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
  static readonly GCLOUD_NOT_INSTALLED =
    'Extension requires the gcloud SDK to be installed to authenticate with BigQuery.\
    Please download and install the SDK, or use a Service Account instead.\
    https://cloud.google.com/sdk/';
  static readonly GCLOUD_AUTHENTICATION_FAILED = 'Got an error when attempting to authenticate with default credentials.';
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

  async authenticateClient(client: Client): Promise<string | undefined> {
    const bigQuery = (<BigQueryClient>client).bigQuery;
    return bigQuery.authClient
      .getCredentials()
      .then(() => {
        return undefined;
      })
      .catch(async () => {
        const gcloudInstalled = await this.gcloudInstalled();
        if (!gcloudInstalled) {
          return OAuthProfile.GCLOUD_NOT_INSTALLED;
        }

        const authenticateCommand = 'gcloud auth application-default login';
        const authenticationResult = await OAuthProfile.processExecutor.execProcess(authenticateCommand);
        if (authenticationResult.stderr !== undefined) {
          return OAuthProfile.GCLOUD_AUTHENTICATION_FAILED;
        }

        return undefined;
      });
  }

  private async gcloudInstalled(): Promise<boolean> {
    const versionCommand = 'gcloud --version';
    const versionResult = await OAuthProfile.processExecutor.execProcess(versionCommand);
    return versionResult.stderr == undefined;
  }
}
