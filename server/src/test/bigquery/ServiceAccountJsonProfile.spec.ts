import { BigQueryServiceAccountJsonProfile } from '../../bigquery/BigQueryServiceAccountJsonProfile';
import { YamlParserUtils } from '../../YamlParserUtils';
import {
  BIG_QUERY_CONFIG,
  BQ_SERVICE_ACCOUNT_JSON,
  BQ_SERVICE_ACCOUNT_JSON_MISSING_KEYFILE_JSON,
  getConfigPath,
  shouldPassValidProfile,
  shouldRequireProfileField,
} from '../helper';

describe('Service account json profile', () => {
  it('Should pass valid profile', () => {
    shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_SERVICE_ACCOUNT_JSON);
  });

  it('Should require service account json fields', () => {
    const profiles = YamlParserUtils.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const serviceAccountJsonProfile = new BigQueryServiceAccountJsonProfile();
    shouldRequireProfileField(profiles, serviceAccountJsonProfile, BQ_SERVICE_ACCOUNT_JSON_MISSING_KEYFILE_JSON, 'keyfile_json');
  });
});
