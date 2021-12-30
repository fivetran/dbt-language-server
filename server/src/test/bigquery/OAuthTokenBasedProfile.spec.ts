import * as assert from 'assert';
import { YamlParser } from '../../YamlParser';
import { OAuthTokenBasedProfile } from '../../bigquery/OAuthTokenBasedProfile';
import {
  getConfigPath,
  BIG_QUERY_CONFIG,
  BIG_QUERY_OAUTH_TEMPORARY_MISSING_TOKEN,
  BIG_QUERY_OAUTH_REFRESH_MISSING_REFRESH_TOKEN,
  BIG_QUERY_OAUTH_REFRESH_MISSING_CLIENT_ID,
  BIG_QUERY_OAUTH_REFRESH_MISSING_CLIENT_SECRET,
} from '../helper';

describe('OAuth token based profile', () => {
  it('Should require oauth temporary token', async () => {
    //arrange
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const oauthTokenBasedProfile = new OAuthTokenBasedProfile();

    //act
    const missingTokenResult = oauthTokenBasedProfile.validateProfile(profiles[BIG_QUERY_OAUTH_TEMPORARY_MISSING_TOKEN].outputs.dev);

    //assert
    assert.strictEqual(missingTokenResult, 'token');
  });

  it('Should require oauth refresh token fields', async () => {
    //arrange
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const oauthTokenBasedProfile = new OAuthTokenBasedProfile();

    //act
    const missingRefreshTokenResult = oauthTokenBasedProfile.validateProfile(profiles[BIG_QUERY_OAUTH_REFRESH_MISSING_REFRESH_TOKEN].outputs.dev);
    const missingClientIdResult = oauthTokenBasedProfile.validateProfile(profiles[BIG_QUERY_OAUTH_REFRESH_MISSING_CLIENT_ID].outputs.dev);
    const missingClientSecretResult = oauthTokenBasedProfile.validateProfile(profiles[BIG_QUERY_OAUTH_REFRESH_MISSING_CLIENT_SECRET].outputs.dev);

    //assert
    assert.strictEqual(missingRefreshTokenResult, 'refresh_token');
    assert.strictEqual(missingClientIdResult, 'client_id');
    assert.strictEqual(missingClientSecretResult, 'client_secret');
  });
});
