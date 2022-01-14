import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { DbtProfile } from '../DbtProfile';
import { ProcessExecutor } from '../ProcessExecutor';
import { BigQueryClient } from './BigQueryClient';

export class OAuthProfile implements DbtProfile {
  static readonly BQ_OAUTH_DOCS =
    '[OAuth via gcloud configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-via-gcloud).';
  static readonly GCLOUD_NOT_INSTALLED_ERROR =
    'Extension requires the gcloud SDK to be installed to authenticate with BigQuery.\
    Please [download and install the SDK](https://cloud.google.com/sdk), or use a Service Account instead.';
  static readonly GCLOUD_AUTHENTICATION_ERROR = 'Got an error when attempting to authenticate with default credentials.';
  static readonly GCLOUD_AUTHENTICATION_TIMEOUT = 30000;
  static readonly GCLOUD_AUTHENTICATION_TIMEOUT_ERROR = 'Failed to authenticate within the given period.';

  static processExecutor = new ProcessExecutor();

  getDocsUrl(): string {
    return OAuthProfile.BQ_OAUTH_DOCS;
  }

  validateProfile(targetConfig: any): string | undefined {
    const { project } = targetConfig;
    if (!project) {
      return 'project';
    }

    return undefined;
  }

  async createClient(profile: any): Promise<DbtDestinationClient | string> {
    const { project } = profile;
    const options: BigQueryOptions = {
      projectId: project,
    };
    const bigQuery = new BigQuery(options);
    const bigQueryClient = new BigQueryClient(project, bigQuery);

    const credentialsResult = await this.checkDefaultCredentials(bigQueryClient);
    if (!credentialsResult) {
      const firstTestResult = await bigQueryClient.test();
      if (!firstTestResult) {
        return bigQueryClient;
      }
    }

    const authenticateResult = await this.authenticate();
    if (authenticateResult) {
      return authenticateResult;
    }

    const secondTestResult = await bigQueryClient.test();
    if (secondTestResult.isErr()) {
      return secondTestResult.error;
    }

    return bigQueryClient;
  }

  private async checkDefaultCredentials(bigQueryClient: BigQueryClient): Promise<string | undefined> {
    return bigQueryClient.bigQuery.authClient
      .getCredentials()
      .then(() => {
        console.log('Default Credentials found');
        return undefined;
      })
      .catch((error: string) => {
        console.log('Default Credentials not found');
        return error;
      });
  }

  private async authenticate(): Promise<string | undefined> {
    const gcloudInstalledResult = await OAuthProfile.gcloudInstalled();
    if (gcloudInstalledResult) {
      return gcloudInstalledResult;
    }

    const authenticateResult = await OAuthProfile.authenticate();
    if (authenticateResult) {
      return authenticateResult;
    }

    console.log('gcloud authentication succeeded');
    return undefined;
  }

  private static authenticate(): Promise<string | undefined> {
    const authenticateCommand = 'gcloud auth application-default login';
    const authenticatePromise = OAuthProfile.processExecutor
      .execProcess(authenticateCommand)
      .then(() => undefined)
      .catch(() => {
        console.log('gcloud authentication failed');
        return OAuthProfile.GCLOUD_AUTHENTICATION_ERROR;
      });

    const timeoutPromise = new Promise<string | undefined>((resolve, _) => {
      setTimeout(() => {
        console.log('gcloud authentication timeout');
        resolve(OAuthProfile.GCLOUD_AUTHENTICATION_TIMEOUT_ERROR);
      }, OAuthProfile.GCLOUD_AUTHENTICATION_TIMEOUT);
    });

    return Promise.race([authenticatePromise, timeoutPromise]);
  }

  private static gcloudInstalled(): Promise<string | undefined> {
    const versionCommand = 'gcloud --version';
    return OAuthProfile.processExecutor
      .execProcess(versionCommand)
      .then(() => undefined)
      .catch(() => {
        console.log('gcloud not installed');
        return OAuthProfile.GCLOUD_NOT_INSTALLED_ERROR;
      });
  }
}
