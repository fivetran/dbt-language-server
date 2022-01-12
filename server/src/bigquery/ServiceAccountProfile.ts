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

  validateProfile(targetConfig: any): string | undefined {
    const project = targetConfig.project;
    if (!project) {
      return 'project';
    }

    const keyFilePath = targetConfig.keyfile;
    if (!keyFilePath) {
      return 'keyfile';
    }

    return undefined;
  }

  async createClient(profile: any): Promise<DbtDestinationClient | string> {
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
      return testResult.val;
    }

    return client;
  }
}
