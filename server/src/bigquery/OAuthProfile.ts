import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { err, ok, Result } from 'neverthrow';
import { setTimeout } from 'node:timers/promises';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { DbtProfile, TargetConfig } from '../DbtProfile';
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

  validateProfile(targetConfig: TargetConfig): Result<void, string> {
    const { project } = targetConfig;
    if (!project) {
      return err('project');
    }

    return ok(undefined);
  }

  async createClient(profile: Required<TargetConfig>): Promise<Result<DbtDestinationClient, string>> {
    const { project } = profile;
    const options: BigQueryOptions = {
      projectId: project,
    };
    const bigQuery = new BigQuery(options);
    const bigQueryClient = new BigQueryClient(project, bigQuery);

    const credentialsResult = await this.checkDefaultCredentials(bigQueryClient);
    if (credentialsResult.isOk()) {
      const firstTestResult = await bigQueryClient.test();
      if (firstTestResult.isOk()) {
        return ok(bigQueryClient);
      }
    }

    const authenticateResult = await this.authenticate();
    if (authenticateResult.isErr()) {
      console.log(authenticateResult.error);
      return err(authenticateResult.error);
    }

    console.log('gcloud authentication succeeded');
    bigQueryClient.bigQuery = new BigQuery(options);

    const secondTestResult = await bigQueryClient.test();
    if (secondTestResult.isErr()) {
      return err(secondTestResult.error);
    }

    return ok(bigQueryClient);
  }

  private async checkDefaultCredentials(bigQueryClient: BigQueryClient): Promise<Result<void, string>> {
    return bigQueryClient.bigQuery.authClient
      .getCredentials()
      .then(() => {
        console.log('Default Credentials found');
        return ok(undefined);
      })
      .catch((error: string) => {
        console.log('Default Credentials not found');
        return err(error);
      });
  }

  private async authenticate(): Promise<Result<void, string>> {
    const gcloudInstalledResult = await OAuthProfile.gcloudInstalled();
    if (gcloudInstalledResult.isErr()) {
      return err(gcloudInstalledResult.error);
    }

    const authenticateResult = await OAuthProfile.authenticate();
    if (authenticateResult.isErr()) {
      return err(authenticateResult.error);
    }

    return ok(undefined);
  }

  private static authenticate(): Promise<Result<void, string>> {
    const authenticateCommand = 'gcloud auth application-default login';
    const authenticatePromise = OAuthProfile.processExecutor
      .execProcess(authenticateCommand)
      .then(() => ok(undefined))
      .catch(() => err(OAuthProfile.GCLOUD_AUTHENTICATION_ERROR));

    const timeoutPromise = setTimeout(OAuthProfile.GCLOUD_AUTHENTICATION_TIMEOUT, err(OAuthProfile.GCLOUD_AUTHENTICATION_TIMEOUT_ERROR));
    return Promise.race([authenticatePromise, timeoutPromise]);
  }

  private static gcloudInstalled(): Promise<Result<void, string>> {
    const versionCommand = 'gcloud --version';
    return OAuthProfile.processExecutor
      .execProcess(versionCommand)
      .then(() => ok(undefined))
      .catch(() => err(OAuthProfile.GCLOUD_NOT_INSTALLED_ERROR));
  }
}
