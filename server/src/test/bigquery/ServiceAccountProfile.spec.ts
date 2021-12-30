import * as assert from 'assert';
import { YamlParser } from '../../YamlParser';
import { ServiceAccountProfile } from '../../bigquery/ServiceAccountProfile';
import { getConfigPath, BIG_QUERY_CONFIG, BIG_QUERY_SERVICE_ACCOUNT } from '../helper';

describe('Service account profile', () => {
  it('Should require service account fields', async () => {
    //arrange
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const serviceAccountProfile = new ServiceAccountProfile();

    const missingKeyFileProfiles = JSON.parse(JSON.stringify(profiles));
    delete missingKeyFileProfiles[BIG_QUERY_SERVICE_ACCOUNT].outputs.dev.keyfile;

    //act
    const missingKeyFileResult = serviceAccountProfile.validateProfile(missingKeyFileProfiles[BIG_QUERY_SERVICE_ACCOUNT].outputs.dev);

    //assert
    assert.strictEqual(missingKeyFileResult, 'keyfile');
  });
});
