import { YamlParser } from '../../YamlParser';
import { ServiceAccountProfile } from '../../bigquery/ServiceAccountProfile';
import { getConfigPath, shouldRequireProfileField, BIG_QUERY_CONFIG, BQ_SERVICE_ACCOUNT_MISSING_KEYFILE } from '../helper';

describe('Service account profile', () => {
  it('Should require service account fields', async () => {
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const serviceAccountProfile = new ServiceAccountProfile();
    await shouldRequireProfileField(profiles, serviceAccountProfile, BQ_SERVICE_ACCOUNT_MISSING_KEYFILE, 'keyfile');
  });
});
