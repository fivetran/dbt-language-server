import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { ExternalAccountClientOptions } from 'google-auth-library';
import { err, ok, Result } from 'neverthrow';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { DbtProfile, TargetConfig } from '../DbtProfile';
import { BigQueryClient } from './BigQueryClient';

export class BigQueryServiceAccountJsonProfile implements DbtProfile {
  static readonly BQ_SERVICE_ACCOUNT_JSON_DOCS =
    '[Service Account JSON configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json).';

  getDocsUrl(): string {
    return BigQueryServiceAccountJsonProfile.BQ_SERVICE_ACCOUNT_JSON_DOCS;
  }

  validateProfile(targetConfig: TargetConfig): Result<void, string> {
    const { project } = targetConfig;
    if (!project) {
      return err('project');
    }

    const keyFileJson = targetConfig.keyfile_json;
    if (!keyFileJson) {
      return err('keyfile_json');
    }

    return this.validateKeyFileJson(keyFileJson);
  }

  async createClient(profile: unknown): Promise<Result<DbtDestinationClient, string>> {
    return this.createClientInternal(profile as Required<TargetConfig>);
  }

  private async createClientInternal(profile: Required<TargetConfig>): Promise<Result<DbtDestinationClient, string>> {
    const { project } = profile;
    const keyFileJson = JSON.stringify(profile.keyfile_json);

    const content = JSON.parse(keyFileJson) as ExternalAccountClientOptions;
    const options: BigQueryOptions = {
      projectId: project,
      credentials: content,
    };
    const bigQuery = new BigQuery(options);
    const client = new BigQueryClient(project, () => bigQuery);

    const testResult = await client.test();
    if (testResult.isErr()) {
      return err(testResult.error);
    }

    return ok(client);
  }

  private validateKeyFileJson(keyFileJson: { private_key?: string }): Result<void, string> {
    const privateKey = keyFileJson.private_key;
    if (!privateKey) {
      return err('private_key');
    }
    return ok(undefined);
  }
}
