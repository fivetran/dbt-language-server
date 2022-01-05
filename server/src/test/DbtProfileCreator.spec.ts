import * as assert from 'assert';
import { YamlParser } from '../YamlParser';
import { DbtProfileCreator, ErrorResult } from '../DbtProfileCreator';
import {
  getConfigPath,
  getMockParser,
  BIG_QUERY_CONFIG,
  OTHERS_CONFIG,
  BQ_OAUTH,
  BQ_OAUTH_TEMPORARY,
  BQ_OAUTH_REFRESH,
  BQ_SERVICE_ACCOUNT,
  BQ_SERVICE_ACCOUNT_JSON,
  BQ_MISSING_TYPE,
  BQ_MISSING_METHOD,
  BQ_MISSING_PROJECT,
  OTHERS_UNKNOWN_TYPE,
} from './helper';

describe('Profiles Validation', () => {
  it('Should pass valid profiles', async () => {
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_OAUTH);
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_OAUTH_TEMPORARY);
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_OAUTH_REFRESH);
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_SERVICE_ACCOUNT);
    await shouldPassValidProfile(BIG_QUERY_CONFIG, BQ_SERVICE_ACCOUNT_JSON);
  });

  it('Should require type', async () => {
    const errorPattern = new RegExp(`^Couldn't find section 'outputs.dev.type'.*$`);
    await shouldReturnError(BIG_QUERY_CONFIG, BQ_MISSING_TYPE, errorPattern);
  });

  it('Should require method', async () => {
    const errorPattern = new RegExp(`^Unknown authentication method of 'bigquery' profile.*$`);
    await shouldReturnError(BIG_QUERY_CONFIG, BQ_MISSING_METHOD, errorPattern);
  });

  it('Should require project', async () => {
    const errorPattern = new RegExp(`^Couldn't find section 'project'.*$`);
    await shouldReturnError(BIG_QUERY_CONFIG, BQ_MISSING_PROJECT, errorPattern);
  });

  it('Should handle profile without credentials', async () => {
    const notExistingProfile = 'not-existing-profile';
    const errorPattern = new RegExp(`^Couldn't find credentials for profile '${notExistingProfile}'.*$`);
    await shouldReturnError(OTHERS_CONFIG, notExistingProfile, errorPattern);
  });

  it('Should handle not supported type', async () => {
    const errorPattern = new RegExp(`^Currently, 'unknown' profile is not supported\\. Check your.*$`);
    await shouldReturnError(OTHERS_CONFIG, OTHERS_UNKNOWN_TYPE, errorPattern);
  });

  it('Should handle profiles file not found', async () => {
    const errorPattern = new RegExp(`^Failed to open and parse file.*$`);
    await shouldReturnError('not_existing_config.yml', 'not-existing-profile', errorPattern);
  });

  it('Should require dbt project config', async () => {
    //arrange
    const yamlParser = new YamlParser();
    yamlParser.profilesPath = getConfigPath(OTHERS_CONFIG);
    yamlParser.findProfileName = (): string => {
      throw new Error();
    };

    const profileCreator = new DbtProfileCreator(yamlParser);
    const errorPattern = new RegExp(
      `^Failed to find profile name in ${YamlParser.DBT_PROJECT_FILE_NAME}\\. Make sure that you opened folder with ${YamlParser.DBT_PROJECT_FILE_NAME} file\\..*$`,
    );

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.match((profile as ErrorResult).error, errorPattern);
  });

  async function shouldReturnError(config: string, profileName: string, errorPattern: RegExp): Promise<void> {
    //arrange
    const yamlParser = getMockParser(config, profileName);
    const profileCreator = new DbtProfileCreator(yamlParser);

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.match((profile as ErrorResult).error, errorPattern);
  }

  async function shouldPassValidProfile(config: string, profileName: string): Promise<void> {
    //arrange
    const yamlParser = getMockParser(config, profileName);
    const profileCreator = new DbtProfileCreator(yamlParser);

    //act
    const profile = await profileCreator.createDbtProfile();

    //assert
    assert.strictEqual('error' in profile, false);
  }
});
