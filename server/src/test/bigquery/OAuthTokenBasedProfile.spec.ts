import { OAuthTokenBasedProfile } from '../../bigquery/OAuthTokenBasedProfile';
import { YamlParser } from '../../YamlParser';
import {
  BIG_QUERY_CONFIG,
  BQ_OAUTH_REFRESH,
  BQ_OAUTH_REFRESH_MISSING_CLIENT_ID,
  BQ_OAUTH_REFRESH_MISSING_CLIENT_SECRET,
  BQ_OAUTH_REFRESH_MISSING_REFRESH_TOKEN,
  BQ_OAUTH_TEMPORARY,
  BQ_OAUTH_TEMPORARY_MISSING_TOKEN,
  getConfigPath,
  shouldPassValidProfile,
  shouldRequireProfileField,
} from '../helper';

describe('OAuth token based profile', () => {
  it('Should pass valid profiles', async () => {
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_OAUTH_TEMPORARY);
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_OAUTH_REFRESH);
  });

  it('Should require oauth temporary token', async () => {
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const oauthTokenBasedProfile = new OAuthTokenBasedProfile();
    await shouldRequireProfileField(profiles, oauthTokenBasedProfile, BQ_OAUTH_TEMPORARY_MISSING_TOKEN, 'token');
  });

  it('Should require oauth refresh token fields', async () => {
    const profiles = YamlParser.parseYamlFile(getConfigPath(BIG_QUERY_CONFIG));
    const oauthTokenBasedProfile = new OAuthTokenBasedProfile();

    await shouldRequireProfileField(profiles, oauthTokenBasedProfile, BQ_OAUTH_REFRESH_MISSING_REFRESH_TOKEN, 'refresh_token');
    await shouldRequireProfileField(profiles, oauthTokenBasedProfile, BQ_OAUTH_REFRESH_MISSING_CLIENT_ID, 'client_id');
    await shouldRequireProfileField(profiles, oauthTokenBasedProfile, BQ_OAUTH_REFRESH_MISSING_CLIENT_SECRET, 'client_secret');
  });
});
