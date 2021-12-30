import * as assert from 'assert';
import { YamlParser } from '../../YamlParser';
import { OAuthTokenBasedProfile } from '../../bigquery/OAuthTokenBasedProfile';
import { getConfigPath, BIG_QUERY_CONFIG, BIG_QUERY_OAUTH_TEMPORARY, BIG_QUERY_OAUTH_REFRESH } from '../helper';

describe('OAuth token based profile', () => {
  it('Should require oauth temporary token', async () => {
    //arrange
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const oauthTokenBasedProfile = new OAuthTokenBasedProfile();

    const missingTokenProfiles = JSON.parse(JSON.stringify(profiles));
    delete missingTokenProfiles[BIG_QUERY_OAUTH_TEMPORARY].outputs.dev.token;

    //act
    const missingTokenResult = oauthTokenBasedProfile.validateProfile(missingTokenProfiles[BIG_QUERY_OAUTH_TEMPORARY].outputs.dev);

    //assert
    assert.strictEqual(missingTokenResult, 'token');
  });

  it('Should require oauth refresh token fields', async () => {
    //arrange
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const oauthTokenBasedProfile = new OAuthTokenBasedProfile();

    const missingRefreshTokenProfiles = JSON.parse(JSON.stringify(profiles));
    delete missingRefreshTokenProfiles[BIG_QUERY_OAUTH_REFRESH].outputs.dev.refresh_token;

    const missingClientIdProfiles = JSON.parse(JSON.stringify(profiles));
    delete missingClientIdProfiles[BIG_QUERY_OAUTH_REFRESH].outputs.dev.client_id;

    const missingClientSecretProfiles = JSON.parse(JSON.stringify(profiles));
    delete missingClientSecretProfiles[BIG_QUERY_OAUTH_REFRESH].outputs.dev.client_secret;

    //act
    const missingRefreshTokenResult = oauthTokenBasedProfile.validateProfile(missingRefreshTokenProfiles[BIG_QUERY_OAUTH_REFRESH].outputs.dev);
    const missingClientIdResult = oauthTokenBasedProfile.validateProfile(missingClientIdProfiles[BIG_QUERY_OAUTH_REFRESH].outputs.dev);
    const missingClientSecretResult = oauthTokenBasedProfile.validateProfile(missingClientSecretProfiles[BIG_QUERY_OAUTH_REFRESH].outputs.dev);

    //assert
    assert.strictEqual(missingRefreshTokenResult, 'refresh_token');
    assert.strictEqual(missingClientIdResult, 'client_id');
    assert.strictEqual(missingClientSecretResult, 'client_secret');
  });
});
