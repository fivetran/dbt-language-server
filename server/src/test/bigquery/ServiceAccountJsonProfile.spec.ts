import { ServiceAccountJsonProfile } from '../../bigquery/ServiceAccountJsonProfile';
import { YamlParser } from '../../YamlParser';
import {
  BIG_QUERY_CONFIG,
  BQ_SERVICE_ACCOUNT_JSON,
  BQ_SERVICE_ACCOUNT_JSON_MISSING_KEYFILE_JSON,
  getConfigPath,
  shouldPassValidProfile,
  shouldRequireProfileField,
} from '../helper';

describe('Service account json profile', () => {
  it('Should pass valid profile', async () => {
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_SERVICE_ACCOUNT_JSON);
  });

  it('Should require service account json fields', async () => {
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const serviceAccountJsonProfile = new ServiceAccountJsonProfile();
    await shouldRequireProfileField(profiles, serviceAccountJsonProfile, BQ_SERVICE_ACCOUNT_JSON_MISSING_KEYFILE_JSON, 'keyfile_json');
  });
});
