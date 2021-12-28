// import * as assert from 'assert';
// import * as path from 'path';
// import { BIG_QUERY_PROFILES } from '../DbtDestinationProfileType';
// import { YamlParser } from '../YamlParser';
// import { BigQueryClient } from '../bigquery/BigQueryClient';
// import { OAuthProfile } from '../bigquery/OAuthProfile';
// import { OAuthTokenBasedProfile } from '../bigquery/OAuthTokenBasedProfile';
// import { ServiceAccountProfile } from '../bigquery/ServiceAccountProfile';
// import { ServiceAccountJsonProfile } from '../bigquery/ServiceAccountJsonProfile';
// import { DbtDestinationClient } from '../DbtDestinationClient';

describe('Profiles Validation', () => {
  // const PROFILES_PATH = path.resolve(__dirname, '../../src/test/profiles');
  // const BIG_QUERY_CONFIG = 'bigquery.yml';

  it('Should create right BigQuery profile', async () => {
    // arrange
    // mockProfileBuilders();
    // const oauthYamlParser = getMockParser(BIG_QUERY_CONFIG, 'bigquery-test_oauth');
    // const oauthSecretsTemporaryYamlParser = getMockParser(BIG_QUERY_CONFIG, 'bigquery-test_oauth_temporary');
    // const oauthSecretsRefreshYamlParser = getMockParser(BIG_QUERY_CONFIG, 'bigquery-test_oauth_refresh');
    // const serviceAccountYamlParser = getMockParser(BIG_QUERY_CONFIG, 'bigquery-test_service_account');
    // const serviceAccountJsonYamlParser = getMockParser(BIG_QUERY_CONFIG, 'bigquery-test_service_account_json');
    // act
    // const oauthProfileResult = await oauthYamlParser.createDbtProfile();
    // const oauthSecretsTemporaryProfileResult = await oauthSecretsTemporaryYamlParser.createDbtProfile();
    // const oauthSecretsRefreshProfileResult = await oauthSecretsRefreshYamlParser.createDbtProfile();
    // const serviceAccountProfileResult = await serviceAccountYamlParser.createDbtProfile();
    // const serviceAccountJsonProfileResult = await serviceAccountJsonYamlParser.createDbtProfile();
    // assert
    // assert.strictEqual(oauthProfileResult.error, undefined);
    // assert.strictEqual(oauthSecretsTemporaryProfileResult.error, undefined);
    // assert.strictEqual(oauthSecretsRefreshProfileResult.error, undefined);
    // assert.strictEqual(serviceAccountProfileResult.error, undefined);
    // assert.strictEqual(serviceAccountJsonProfileResult.error, undefined);
    // assert.strictEqual(oauthProfileResult.client instanceof BigQueryClient, true);
    // assert.strictEqual(oauthSecretsTemporaryProfileResult.client instanceof BigQueryClient, true);
    // assert.strictEqual(oauthSecretsRefreshProfileResult.client instanceof BigQueryClient, true);
    // assert.strictEqual(serviceAccountProfileResult.client instanceof BigQueryClient, true);
    // assert.strictEqual(serviceAccountJsonProfileResult.client instanceof BigQueryClient, true);
  });

  // function getMockParser(config: string, profileName: string): YamlParser {
  //   const yamlParser = new YamlParser();
  //   yamlParser.profilesPath = getConfigPath(config);
  //   yamlParser.findProfileName = (): string => {
  //     return profileName;
  //   };
  //   return yamlParser;
  // }

  // function mockProfileBuilders(): void {
  //   BIG_QUERY_PROFILES.set('oauth', () => {
  //     const profile = new OAuthProfile();
  //     profile.authenticateClient = (_: DbtDestinationClient): Promise<string | undefined> => {
  //       return Promise.resolve(undefined);
  //     };
  //     return profile;
  //   });
  //   BIG_QUERY_PROFILES.set('oauth-secrets', () => {
  //     const profile = new OAuthTokenBasedProfile();
  //     profile.authenticateClient = (_: DbtDestinationClient): Promise<string | undefined> => {
  //       return Promise.resolve(undefined);
  //     };
  //     return profile;
  //   });
  //   BIG_QUERY_PROFILES.set('service-account', () => {
  //     const profile = new ServiceAccountProfile();
  //     profile.authenticateClient = (_: DbtDestinationClient): Promise<string | undefined> => {
  //       return Promise.resolve(undefined);
  //     };
  //     return profile;
  //   });
  //   BIG_QUERY_PROFILES.set('service-account-json', () => {
  //     const profile = new ServiceAccountJsonProfile();
  //     profile.authenticateClient = (_: DbtDestinationClient): Promise<string | undefined> => {
  //       return Promise.resolve(undefined);
  //     };
  //     return profile;
  //   });
  // }

  // function getConfigPath(p: string): string {
  //   return path.resolve(PROFILES_PATH, p);
  // }
});
