import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';
import { err, ok, Result } from 'neverthrow';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { DbtProfile } from '../DbtProfile';
import { YamlParserUtils } from '../YamlParserUtils';
import { BigQueryClient } from './BigQueryClient';

export class ServiceAccountProfile implements DbtProfile {
  static readonly BQ_SERVICE_ACCOUNT_FILE_DOCS =
    '[Service Account File configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file).';

  getDocsUrl(): string {
    return ServiceAccountProfile.BQ_SERVICE_ACCOUNT_FILE_DOCS;
  }

  validateProfile(targetConfig: any): Result<void, string> {
    const { project } = targetConfig;
    if (!project) {
      return err('project');
    }

    const keyFilePath = targetConfig.keyfile;
    if (!keyFilePath) {
      return err('keyfile');
    }

    return ok(undefined);
  }

  async createClient(profile: any): Promise<DbtDestinationClient | string> {
    const { project } = profile;
    const keyFilePath = YamlParserUtils.replaceTilde(profile.keyfile);

    const options: BigQueryOptions = {
      projectId: project,
      keyFilename: keyFilePath,
    };
    const bigQuery = new BigQuery(options);
    const client = new BigQueryClient(project, bigQuery);

    const testResult = await client.test();
    if (testResult.isErr()) {
      return testResult.error;
    }

    return client;
  }
}
