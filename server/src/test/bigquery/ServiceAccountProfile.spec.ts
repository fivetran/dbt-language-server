import { YamlParser } from '../../YamlParser';
import { ServiceAccountProfile } from '../../bigquery/ServiceAccountProfile';
import {
  getConfigPath,
  shouldRequireProfileField,
  shouldPassValidProfile,
  BIG_QUERY_CONFIG,
  BQ_SERVICE_ACCOUNT,
  BQ_SERVICE_ACCOUNT_MISSING_KEYFILE,
} from '../helper';

describe('Service account profile', () => {
  it('Should pass valid profile', async () => {
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_SERVICE_ACCOUNT);
  });

  it('Should require service account fields', async () => {
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const serviceAccountProfile = new ServiceAccountProfile();
    await shouldRequireProfileField(profiles, serviceAccountProfile, BQ_SERVICE_ACCOUNT_MISSING_KEYFILE, 'keyfile');
  });
});
