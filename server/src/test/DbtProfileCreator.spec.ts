import * as assert from 'assert';
import { assertThat, matchesPattern } from 'hamjest';
import { instance, mock, when } from 'ts-mockito';
import { DbtProfileCreator } from '../DbtProfileCreator';
import { DbtRepository } from '../DbtRepository';
import { YamlParser } from '../YamlParser';
import {
  BIG_QUERY_CONFIG,
  BQ_MISSING_METHOD,
  BQ_MISSING_PROJECT,
  BQ_MISSING_TYPE,
  getConfigPath,
  OTHERS_CONFIG,
  OTHERS_UNKNOWN_TYPE,
} from './helper';

describe('Profiles Validation', () => {
  it('Should require type', () => {
    shouldReturnError(BIG_QUERY_CONFIG, BQ_MISSING_TYPE, /^Couldn't find section 'outputs.dev.type'.*$/);
  });

  it('Should require method', () => {
    shouldReturnError(BIG_QUERY_CONFIG, BQ_MISSING_METHOD, /^Unknown authentication method of 'bigquery' profile.*$/);
  });

  it('Should require project', () => {
    shouldReturnError(BIG_QUERY_CONFIG, BQ_MISSING_PROJECT, /^Couldn't find section 'project'.*$/);
  });

  it('Should handle profile without credentials', () => {
    const notExistingProfile = 'not-existing-profile';
    const errorPattern = new RegExp(`^Couldn't find credentials for profile '${notExistingProfile}'.*$`);
    shouldReturnError(OTHERS_CONFIG, notExistingProfile, errorPattern);
  });

  it('Should handle not supported type', () => {
    shouldReturnError(OTHERS_CONFIG, OTHERS_UNKNOWN_TYPE, /^Currently, 'unknown' profile is not supported. Check your.*$/);
  });

  it('Should handle profiles file not found', () => {
    shouldReturnError('not_existing_config.yml', 'not-existing-profile', /^Failed to open and parse file.*$/);
  });

  it('Should require dbt project config', () => {
    // arrange
    const mockYamlParser = mock(YamlParser);
    when(mockYamlParser.findProfileName()).thenThrow(new Error());
    const yamlParser = instance(mockYamlParser);
    yamlParser.profilesPath = getConfigPath(OTHERS_CONFIG);

    const profileCreator = new DbtProfileCreator(yamlParser);
    const errorPattern = new RegExp(`^Failed to find profile name in .*${DbtRepository.DBT_PROJECT_FILE_NAME}\\...*$`);

    // act
    const profile = profileCreator.createDbtProfile();

    // assert
    assert.ok(profile.isErr());
    assertThat(profile.error.message, matchesPattern(errorPattern));
  });

  function shouldReturnError(config: string, profileName: string, errorPattern: RegExp): void {
    // arrange
    const mockYamlParser = mock(YamlParser);
    when(mockYamlParser.findProfileName()).thenReturn(profileName);
    const yamlParser = instance(mockYamlParser);
    yamlParser.profilesPath = getConfigPath(config);

    const profileCreator = new DbtProfileCreator(yamlParser);

    // act
    const profile = profileCreator.createDbtProfile();

    // assert
    assert.ok(profile.isErr());
    assertThat(profile.error.message, matchesPattern(errorPattern));
  }
});
