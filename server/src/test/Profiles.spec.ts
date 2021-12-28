import * as assert from 'assert';
import * as path from 'path';
import { DbtDestinationProfileCreator } from '../DbtDestinationProfileCreator';
import { YamlParser } from '../YamlParser';

describe('Profiles Validation', () => {
  const PROFILES_PATH = path.resolve(__dirname, '../../src/test/profiles');
  const BIG_QUERY_CONFIG = 'bigquery.yml';

  it('Should pass valid BigQuery profiles', async () => {
    // arrange
    const oauthYamlParser = getMockParser(BIG_QUERY_CONFIG, 'bigquery-test_oauth');
    const oauthSecretsTemporaryYamlParser = getMockParser(BIG_QUERY_CONFIG, 'bigquery-test_oauth_temporary');
    const oauthSecretsRefreshYamlParser = getMockParser(BIG_QUERY_CONFIG, 'bigquery-test_oauth_refresh');
    const serviceAccountYamlParser = getMockParser(BIG_QUERY_CONFIG, 'bigquery-test_service_account');
    const serviceAccountJsonYamlParser = getMockParser(BIG_QUERY_CONFIG, 'bigquery-test_service_account_json');

    const oauthProfileCreator = new DbtDestinationProfileCreator(oauthYamlParser);
    const oauthSecretsTemporaryProfileCreator = new DbtDestinationProfileCreator(oauthSecretsTemporaryYamlParser);
    const oauthSecretsRefreshProfileCreator = new DbtDestinationProfileCreator(oauthSecretsRefreshYamlParser);
    const serviceAccountProfileCreator = new DbtDestinationProfileCreator(serviceAccountYamlParser);
    const serviceAccountJsonProfileCreator = new DbtDestinationProfileCreator(serviceAccountJsonYamlParser);

    // act
    const oauthProfile = await oauthProfileCreator.createDbtProfile();
    const oauthSecretsTemporaryProfile = await oauthSecretsTemporaryProfileCreator.createDbtProfile();
    const oauthSecretsRefreshProfile = await oauthSecretsRefreshProfileCreator.createDbtProfile();
    const serviceAccountProfile = await serviceAccountProfileCreator.createDbtProfile();
    const serviceAccountJsonProfile = await serviceAccountJsonProfileCreator.createDbtProfile();

    //assert
    assert.strictEqual(oauthProfile.error, undefined);
    assert.strictEqual(oauthSecretsTemporaryProfile.error, undefined);
    assert.strictEqual(oauthSecretsRefreshProfile.error, undefined);
    assert.strictEqual(serviceAccountProfile.error, undefined);
    assert.strictEqual(serviceAccountJsonProfile.error, undefined);
  });

  function getMockParser(config: string, profileName: string): YamlParser {
    const yamlParser = new YamlParser();
    yamlParser.profilesPath = getConfigPath(config);
    yamlParser.findProfileName = (): string => {
      return profileName;
    };
    return yamlParser;
  }

  function getConfigPath(p: string): string {
    return path.resolve(PROFILES_PATH, p);
  }
});
