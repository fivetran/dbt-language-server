import { DbtProfile, ProfileData, Client } from '../../DbtProfile';
import { OAuthData } from './OAuthData';
import { BigQueryClient } from '../BigQueryClient';
import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { ProcessExecutor } from '../../ProcessExecutor';

export class OAuthProfile extends DbtProfile {
  static readonly BQ_OAUTH_DOCS =
    '[OAuth via gcloud configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-via-gcloud).';
  static readonly GCLOUD_NOT_INSTALLED_ERROR =
    'Extension requires the gcloud SDK to be installed to authenticate with BigQuery.\
    Please download and install the SDK, or use a Service Account instead.\
    https://cloud.google.com/sdk/';
  static readonly GCLOUD_AUTHENTICATION_ERROR = 'Got an error when attempting to authenticate with default credentials.';
  static readonly GCLOUD_AUTHENTICATION_TIMEOUT = 15000;
  static readonly GCLOUD_AUTHENTICATION_TIMEOUT_ERROR = 'Failed to authenticate within the given period';

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
        console.log('Default Credentials found');
        return undefined;
      })
      .catch(async () => {
        console.log('Default Credentials not found');

        const gcloudInstalledResult = await OAuthProfile.gcloudInstalled().catch((error: string) => {
          console.log('gcloud not installed');
          return error;
        });
        if (gcloudInstalledResult) {
          return gcloudInstalledResult;
        }

        const authenticateResult = await OAuthProfile.authenticate().catch((error: string) => {
          console.log('gcloud authentication failed');
          return error;
        });
        if (authenticateResult) {
          return authenticateResult;
        }

        console.log('Auth succeed');
        return undefined;
      });
  }

  private static authenticate(): Promise<string | undefined> {
    const authenticateCommand = 'gcloud auth application-default login';
    const authenticatePromise = OAuthProfile.processExecutor
      .execProcess(authenticateCommand)
      .then(() => undefined)
      .catch(() => OAuthProfile.GCLOUD_AUTHENTICATION_ERROR);

    const timeoutPromise = new Promise<string | undefined>((_resolve, reject) => {
      setTimeout(() => {
        reject(OAuthProfile.GCLOUD_AUTHENTICATION_TIMEOUT_ERROR);
      }, OAuthProfile.GCLOUD_AUTHENTICATION_TIMEOUT);
    });

    return Promise.race([authenticatePromise, timeoutPromise]);
  }

  private static gcloudInstalled(): Promise<string | undefined> {
    const versionCommand = 'gcloud --version';
    return OAuthProfile.processExecutor
      .execProcess(versionCommand)
      .then(() => undefined)
      .catch(() => OAuthProfile.GCLOUD_NOT_INSTALLED_ERROR);
  }
}
