import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { Result, err, ok } from 'neverthrow';
import { setTimeout } from 'node:timers/promises';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { DbtProfile, TargetConfig } from '../DbtProfile';
import { ProcessExecutor } from '../ProcessExecutor';
import { BigQueryClient } from './BigQueryClient';

export class BigQueryOAuthProfile implements DbtProfile {
  static readonly BQ_OAUTH_DOCS =
    '[OAuth via gcloud configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-via-gcloud).';
  static readonly GCLOUD_NOT_INSTALLED_ERROR =
    'Extension requires the gcloud SDK to be installed to authenticate with BigQuery.\
    Please [download and install the SDK](https://cloud.google.com/sdk), or use a Service Account instead.';
  static readonly GCLOUD_AUTHENTICATION_ERROR = 'Got an error when attempting to authenticate with default credentials.';
  static readonly GCLOUD_AUTHENTICATION_TIMEOUT = 30_000;
  static readonly GCLOUD_AUTHENTICATION_TIMEOUT_ERROR = 'Failed to authenticate within the given period.';

  static processExecutor = new ProcessExecutor();

  getDocsUrl(): string {
    return BigQueryOAuthProfile.BQ_OAUTH_DOCS;
  }

  validateProfile(targetConfig: TargetConfig): Result<void, string> {
    const { project } = targetConfig;
    if (!project) {
      return err('project');
    }

    return ok(undefined);
  }

  async createClient(profile: unknown): Promise<Result<DbtDestinationClient, string>> {
    return this.createClientInternal(profile as Required<TargetConfig>);
  }

  private async createClientInternal(profile: Required<TargetConfig>): Promise<Result<DbtDestinationClient, string>> {
    const { project } = profile;
    const options: BigQueryOptions = {
      projectId: project,
    };

    const bigQueryClient = new BigQueryClient(project, () => new BigQuery(options));

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
      return ok(bigQueryClient);
    }

    console.log('gcloud authentication succeeded');
    return ok(bigQueryClient);
  }

  private async checkDefaultCredentials(bigQueryClient: BigQueryClient): Promise<Result<void, string>> {
    return bigQueryClient.bigQuery.authClient
      .getCredentials()
      .then(() => {
        console.log('Default Credentials found');
        return ok(undefined);
      })
      .catch((e: string) => {
        console.log('Default Credentials not found');
        return err(e);
      });
  }

  private async authenticate(): Promise<Result<void, string>> {
    const gcloudInstalledResult = await BigQueryOAuthProfile.gcloudInstalled();
    if (gcloudInstalledResult.isErr()) {
      return err(gcloudInstalledResult.error);
    }

    const authenticateResult = await BigQueryOAuthProfile.authenticate();
    if (authenticateResult.isErr()) {
      return err(authenticateResult.error);
    }

    return ok(undefined);
  }

  private static authenticate(): Promise<Result<void, string>> {
    const authenticateCommand = 'gcloud auth application-default login';
    const authenticatePromise = BigQueryOAuthProfile.processExecutor
      .execProcess(authenticateCommand)
      .then(() => ok(undefined))
      .catch(() => err(BigQueryOAuthProfile.GCLOUD_AUTHENTICATION_ERROR));

    const timeoutPromise = setTimeout(
      BigQueryOAuthProfile.GCLOUD_AUTHENTICATION_TIMEOUT,
      err(BigQueryOAuthProfile.GCLOUD_AUTHENTICATION_TIMEOUT_ERROR),
    );
    return Promise.race([authenticatePromise, timeoutPromise]);
  }

  private static gcloudInstalled(): Promise<Result<void, string>> {
    const versionCommand = 'gcloud --version';
    return BigQueryOAuthProfile.processExecutor
      .execProcess(versionCommand)
      .then(() => ok(undefined))
      .catch(() => err(BigQueryOAuthProfile.GCLOUD_NOT_INSTALLED_ERROR));
  }
}
