import * as assert from 'assert';
import { YamlParser } from '../../YamlParser';
import { ServiceAccountJsonProfile } from '../../bigquery/ServiceAccountJsonProfile';
import { getConfigPath, BIG_QUERY_CONFIG, BIG_QUERY_SERVICE_ACCOUNT_JSON_MISSING_KEYFILE_JSON } from '../helper';

describe('Service account json profile', () => {
  it('Should require service account json fields', async () => {
    //arrange
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const serviceAccountJsonProfile = new ServiceAccountJsonProfile();

    //act
    const missingKeyFileJsonResult = serviceAccountJsonProfile.validateProfile(
      profiles[BIG_QUERY_SERVICE_ACCOUNT_JSON_MISSING_KEYFILE_JSON].outputs.dev,
    );

    //assert
    assert.strictEqual(missingKeyFileJsonResult, 'keyfile_json');
  });
});
