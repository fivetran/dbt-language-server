import * as assert from 'assert';
import { YamlParser } from '../../YamlParser';
import { ServiceAccountProfile } from '../../bigquery/ServiceAccountProfile';
import { getConfigPath, BIG_QUERY_CONFIG, BQ_SERVICE_ACCOUNT_MISSING_KEYFILE } from '../helper';

describe('Service account profile', () => {
  it('Should require service account fields', async () => {
    //arrange
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const serviceAccountProfile = new ServiceAccountProfile();

    //act
    const missingKeyFileResult = serviceAccountProfile.validateProfile(profiles[BQ_SERVICE_ACCOUNT_MISSING_KEYFILE].outputs.dev);

    //assert
    assert.strictEqual(missingKeyFileResult, 'keyfile');
  });
});
