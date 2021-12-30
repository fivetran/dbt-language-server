import { YamlParser } from '../../YamlParser';
import { ServiceAccountJsonProfile } from '../../bigquery/ServiceAccountJsonProfile';
import { getConfigPath, shouldRequireProfileField, BIG_QUERY_CONFIG, BQ_SERVICE_ACCOUNT_JSON_MISSING_KEYFILE_JSON } from '../helper';

describe('Service account json profile', () => {
  it('Should require service account json fields', async () => {
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const serviceAccountJsonProfile = new ServiceAccountJsonProfile();
    await shouldRequireProfileField(profiles, serviceAccountJsonProfile, BQ_SERVICE_ACCOUNT_JSON_MISSING_KEYFILE_JSON, 'keyfile_json');
  });
});
