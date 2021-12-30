import * as assert from 'assert';
import { YamlParser } from '../../YamlParser';
import { ServiceAccountJsonProfile } from '../../bigquery/ServiceAccountJsonProfile';
import { getConfigPath, BIG_QUERY_CONFIG, BIG_QUERY_SERVICE_ACCOUNT_JSON } from '../helper';

describe('Service account json profile', () => {
  it('Should require service account json fields', async () => {
    //arrange
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const serviceAccountJsonProfile = new ServiceAccountJsonProfile();

    const missingKeyFileJsonProfiles = JSON.parse(JSON.stringify(profiles));
    delete missingKeyFileJsonProfiles[BIG_QUERY_SERVICE_ACCOUNT_JSON].outputs.dev.keyfile_json;

    //act
    const missingKeyFileJsonResult = serviceAccountJsonProfile.validateProfile(
      missingKeyFileJsonProfiles[BIG_QUERY_SERVICE_ACCOUNT_JSON].outputs.dev,
    );

    //assert
    assert.strictEqual(missingKeyFileJsonResult, 'keyfile_json');
  });
});
