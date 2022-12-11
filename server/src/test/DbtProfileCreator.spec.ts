import { assertThat, defined, matchesPattern, not } from 'hamjest';
import * as assert from 'node:assert';
import { instance, mock, when } from 'ts-mockito';
import { DbtProfileCreator } from '../DbtProfileCreator';
import { DbtProject } from '../DbtProject';
import { DbtRepository } from '../DbtRepository';
import {
  BIG_QUERY_CONFIG,
  BQ_MISSING_METHOD,
  BQ_MISSING_PROJECT,
  BQ_MISSING_TYPE,
  getConfigPath,
  OTHERS_CONFIG,
  OTHERS_UNKNOWN_TYPE,
  UNKNOWN_TYPE,
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
    // arrange
    const mockDbtProject = mock(DbtProject);
    when(mockDbtProject.findProfileName()).thenReturn(OTHERS_UNKNOWN_TYPE);
    const dbtProject = instance(mockDbtProject);

    const profileCreator = new DbtProfileCreator(dbtProject, getConfigPath(OTHERS_CONFIG));

    // act
    const profile = profileCreator.createDbtProfile();

    // assert
    assert.ok(profile.isOk());
    assertThat(profile.value.dbtProfile, not(defined()));
    assertThat(profile.value.type, UNKNOWN_TYPE);
    assertThat(profile.value.method, not(defined()));
  });

  it('Should handle profiles file not found', () => {
    shouldReturnError('not_existing_config.yml', 'not-existing-profile', /^Failed to open and parse file.*$/);
  });

  it('Should require dbt project config', () => {
    // arrange
    const mockDbtProject = mock(DbtProject);
    when(mockDbtProject.findProfileName()).thenThrow(new Error('Error while finding profile name'));
    const dbtProject = instance(mockDbtProject);

    const profileCreator = new DbtProfileCreator(dbtProject, getConfigPath(OTHERS_CONFIG));
    const errorPattern = new RegExp(`^Failed to find profile name in .*${DbtRepository.DBT_PROJECT_FILE_NAME}\\...*$`);

    // act
    const profile = profileCreator.createDbtProfile();

    // assert
    assert.ok(profile.isErr());
    assertThat(profile.error.message, matchesPattern(errorPattern));
  });

  it('evalTargetConfig should eval whole config with nested objects', () => {
    // arrange
    const expectedValue = 'test_value';
    process.env['TEST'] = expectedValue;
    const testEnvValue = '{{ env_var("TEST") }}';

    // act
    const result = DbtProfileCreator.evalTargetConfig({
      type: testEnvValue,
      method: testEnvValue,
      project: testEnvValue,
      token: testEnvValue,
      refresh_token: testEnvValue,
      client_id: testEnvValue,
      client_secret: testEnvValue,
      keyfile_json: {
        private_key: testEnvValue,
      },
      keyfile: testEnvValue,
      scopes: [testEnvValue, testEnvValue],
    });

    // assert
    assertThat(result, {
      type: expectedValue,
      method: expectedValue,
      project: expectedValue,
      token: expectedValue,
      refresh_token: expectedValue,
      client_id: expectedValue,
      client_secret: expectedValue,
      keyfile_json: {
        private_key: expectedValue,
      },
      keyfile: expectedValue,
      scopes: [expectedValue, expectedValue],
    });
  });
});

function shouldReturnError(config: string, profileName: string, errorPattern: RegExp): void {
  // arrange
  const mockDbtProject = mock(DbtProject);
  when(mockDbtProject.findProfileName()).thenReturn(profileName);
  const dbtProject = instance(mockDbtProject);

  const profileCreator = new DbtProfileCreator(dbtProject, getConfigPath(config));

  // act
  const profile = profileCreator.createDbtProfile();

  // assert
  assert.ok(profile.isErr());
  assertThat(profile.error.message, matchesPattern(errorPattern));
}
