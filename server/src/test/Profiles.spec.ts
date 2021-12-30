import * as assert from 'assert';
import * as path from 'path';
import { OAuthTokenBasedProfile } from '../bigquery/OAuthTokenBasedProfile';
import { ServiceAccountJsonProfile } from '../bigquery/ServiceAccountJsonProfile';
import { ServiceAccountProfile } from '../bigquery/ServiceAccountProfile';
import { DbtProfileCreator, DbtProfileErrorResult } from '../DbtProfileCreator';
import { YamlParser } from '../YamlParser';

describe('Profiles Validation', () => {
  const PROFILES_PATH = path.resolve(__dirname, '../../src/test/profiles');
  const BIG_QUERY_CONFIG = 'bigquery.yml';

  const BIG_QUERY_OAUTH = 'bigquery-test_oauth';
  const BIG_QUERY_OAUTH_TEMPORARY = 'bigquery-test_oauth_temporary';
  const BIG_QUERY_OAUTH_REFRESH = 'bigquery-test_oauth_refresh';
  const BIG_QUERY_SERVICE_ACCOUNT = 'bigquery-test_service_account';
  const BIG_QUERY_SERVICE_ACCOUNT_JSON = 'bigquery-test_service_account_json';
  const BIG_QUERY_MISSING_TYPE = 'bigquery-test_missing_type';
  const BIG_QUERY_MISSING_METHOD = 'bigquery-test_missing_method';
  const BIG_QUERY_MISSING_PROJECT = 'bigquery-test_missing_project';

  it('Should pass valid BigQuery profiles', async () => {
    //arrange
    const oauthYamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_OAUTH);
    const oauthSecretsTemporaryYamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_OAUTH_TEMPORARY);
    const oauthSecretsRefreshYamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_OAUTH_REFRESH);
    const serviceAccountYamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_SERVICE_ACCOUNT);
    const serviceAccountJsonYamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_SERVICE_ACCOUNT_JSON);

    const oauthProfileCreator = new DbtProfileCreator(oauthYamlParser);
    const oauthSecretsTemporaryProfileCreator = new DbtProfileCreator(oauthSecretsTemporaryYamlParser);
    const oauthSecretsRefreshProfileCreator = new DbtProfileCreator(oauthSecretsRefreshYamlParser);
    const serviceAccountProfileCreator = new DbtProfileCreator(serviceAccountYamlParser);
    const serviceAccountJsonProfileCreator = new DbtProfileCreator(serviceAccountJsonYamlParser);

    //act
    const oauthProfile = await oauthProfileCreator.createDbtProfile();
    const oauthSecretsTemporaryProfile = await oauthSecretsTemporaryProfileCreator.createDbtProfile();
    const oauthSecretsRefreshProfile = await oauthSecretsRefreshProfileCreator.createDbtProfile();
    const serviceAccountProfile = await serviceAccountProfileCreator.createDbtProfile();
    const serviceAccountJsonProfile = await serviceAccountJsonProfileCreator.createDbtProfile();

    //assert
    assert.strictEqual((oauthProfile as DbtProfileErrorResult).error, undefined);
    assert.strictEqual((oauthSecretsTemporaryProfile as DbtProfileErrorResult).error, undefined);
    assert.strictEqual((oauthSecretsRefreshProfile as DbtProfileErrorResult).error, undefined);
    assert.strictEqual((serviceAccountProfile as DbtProfileErrorResult).error, undefined);
    assert.strictEqual((serviceAccountJsonProfile as DbtProfileErrorResult).error, undefined);
  });

  it('Should require type', async () => {
    //arrange
    const yamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_MISSING_TYPE);
    const profileCreator = new DbtProfileCreator(yamlParser);
    const errorPattern = new RegExp(`^Couldn't find section 'outputs.dev.type'.*$`);

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.match((profile as DbtProfileErrorResult).error, errorPattern);
  });

  it('Should require method', async () => {
    //arrange
    const yamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_MISSING_METHOD);
    const profileCreator = new DbtProfileCreator(yamlParser);
    const errorPattern = new RegExp(`^Unknown authentication method of 'bigquery' profile.*$`);

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.match((profile as DbtProfileErrorResult).error, errorPattern);
  });

  it('Should require project', async () => {
    //arrange
    const yamlParser = getMockParser(BIG_QUERY_CONFIG, BIG_QUERY_MISSING_PROJECT);
    const profileCreator = new DbtProfileCreator(yamlParser);
    const errorPattern = new RegExp(`^Couldn't find section 'project'.*$`);

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.match((profile as DbtProfileErrorResult).error, errorPattern);
  });

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
