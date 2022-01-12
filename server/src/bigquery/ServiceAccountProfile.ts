import { Ok, Err, Result } from 'ts-results';
import { DbtProfile } from '../DbtProfile';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { YamlParserUtils } from '../YamlParserUtils';
import { BigQueryClient } from './BigQueryClient';
import { BigQuery, BigQueryOptions } from '@google-cloud/bigquery';

export class ServiceAccountProfile implements DbtProfile {
  static readonly BQ_SERVICE_ACCOUNT_FILE_DOCS =
    '[Service Account File configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file).';

  getDocsUrl(): string {
    return ServiceAccountProfile.BQ_SERVICE_ACCOUNT_FILE_DOCS;
  }

  validateProfile(targetConfig: any): Result<void, string> {
    const project = targetConfig.project;
    if (!project) {
      return Err('project');
    }

    const keyFilePath = targetConfig.keyfile;
    if (!keyFilePath) {
      return Err('keyfile');
    }

    return Ok.EMPTY;
  }

  async createClient(profile: any): Promise<Result<DbtDestinationClient, string>> {
    const project = profile.project;
    const keyFilePath = YamlParserUtils.replaceTilde(profile.keyfile);

    const options: BigQueryOptions = {
      projectId: project,
      keyFilename: keyFilePath,
    };
    const bigQuery = new BigQuery(options);
    const client = new BigQueryClient(project, bigQuery);

    const testResult = await client.test();
    if (testResult.err) {
      return Err(testResult.val);
    }

    return Ok(client);
  }
}
