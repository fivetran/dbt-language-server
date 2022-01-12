import { Ok, Err, Result } from 'ts-results';
import { DbtProfile } from '../DbtProfile';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { ExternalAccountClientOptions } from 'google-auth-library';
import { BigQueryClient } from './BigQueryClient';

export class ServiceAccountJsonProfile implements DbtProfile {
  static readonly BQ_SERVICE_ACCOUNT_JSON_DOCS =
    '[Service Account JSON configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json).';

  getDocsUrl(): string {
    return ServiceAccountJsonProfile.BQ_SERVICE_ACCOUNT_JSON_DOCS;
  }

  validateProfile(targetConfig: any): Result<void, string> {
    const project = targetConfig.project;
    if (!project) {
      return Err('project');
    }

    const keyFileJson = targetConfig.keyfile_json;
    if (!keyFileJson) {
      return Err('keyfile_json');
    }

    return this.validateKeyFileJson(keyFileJson);
  }

  async createClient(profile: any): Promise<Result<DbtDestinationClient, string>> {
    const project = profile.project;
    const keyFileJson = JSON.stringify(profile.keyfile_json);

    const content = <ExternalAccountClientOptions>JSON.parse(keyFileJson);
    const options: BigQueryOptions = {
      projectId: project,
      credentials: content,
    };
    const bigQuery = new BigQuery(options);
    const client = new BigQueryClient(project, bigQuery);

    const testResult = await client.test();
    if (testResult.err) {
      return Err(testResult.val);
    }

    return Ok(client);
  }

  private validateKeyFileJson(keyFileJson: any): Result<void, string> {
    const privateKey = keyFileJson.private_key;
    if (!privateKey) {
      return Err('private_key');
    }
    return Ok.EMPTY;
  }
}
