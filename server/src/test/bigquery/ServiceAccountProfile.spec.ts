import { ServiceAccountProfile } from '../../bigquery/ServiceAccountProfile';
import { YamlParser } from '../../YamlParser';
import {
  BIG_QUERY_CONFIG,
  BQ_SERVICE_ACCOUNT,
  BQ_SERVICE_ACCOUNT_MISSING_KEYFILE,
  getConfigPath,
  shouldPassValidProfile,
  shouldRequireProfileField,
} from '../helper';

describe('Service account profile', () => {
  it('Should pass valid profile', () => {
    shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_SERVICE_ACCOUNT);
  });

  it('Should require service account fields', () => {
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const serviceAccountProfile = new ServiceAccountProfile();
    shouldRequireProfileField(profiles, serviceAccountProfile, BQ_SERVICE_ACCOUNT_MISSING_KEYFILE, 'keyfile');
  });
});
