import { ok } from 'assert';
import { assertThat, defined, not } from 'hamjest';
import { err } from 'neverthrow';
import * as path from 'path';
import { instance, mock, when } from 'ts-mockito';
import { CompletionItem } from 'vscode-languageserver';
import { DbtNodeCompletionProvider } from '../completion/DbtCompletionProvider';
import { DbtProfile, ProfileYaml } from '../DbtProfile';
import { DbtProfileCreator } from '../DbtProfileCreator';
import { DbtProject } from '../DbtProject';
import { JinjaPartType } from '../JinjaParser';

const PROFILES_PATH = path.resolve(__dirname, '../../src/test/profiles');

export const BIG_QUERY_CONFIG = 'bigquery.yml';
export const OTHERS_CONFIG = 'others.yml';

export const BQ_OAUTH = 'bigquery-test_oauth';
export const BQ_OAUTH_TEMPORARY = 'bigquery-test_oauth_temporary';
export const BQ_OAUTH_TEMPORARY_MISSING_TOKEN = 'bigquery-test_oauth_temporary_missing_token';
export const BQ_OAUTH_REFRESH = 'bigquery-test_oauth_refresh';
export const BQ_OAUTH_REFRESH_MISSING_REFRESH_TOKEN = 'bigquery-test_oauth_refresh_missing_refresh_token';
export const BQ_OAUTH_REFRESH_MISSING_CLIENT_ID = 'bigquery-test_oauth_refresh_missing_client_id';
export const BQ_OAUTH_REFRESH_MISSING_CLIENT_SECRET = 'bigquery-test_oauth_refresh_missing_client_secret';
export const BQ_SERVICE_ACCOUNT = 'bigquery-test_service_account';
export const BQ_SERVICE_ACCOUNT_MISSING_KEYFILE = 'bigquery-test_service_account_missing_keyfile';
export const BQ_SERVICE_ACCOUNT_JSON = 'bigquery-test_service_account_json';
export const BQ_SERVICE_ACCOUNT_JSON_MISSING_KEYFILE_JSON = 'bigquery-test_service_account_json_missing_keyfile_json';
export const BQ_MISSING_TYPE = 'bigquery-test_missing_type';
export const BQ_MISSING_METHOD = 'bigquery-test_missing_method';
export const BQ_MISSING_PROJECT = 'bigquery-test_missing_project';

export const OTHERS_UNKNOWN_TYPE = 'unknown-type';
export const UNKNOWN_TYPE = 'unknown';

export function getConfigPath(p: string): string {
  return path.resolve(PROFILES_PATH, p);
}

export function shouldRequireProfileField(profiles: unknown, profile: DbtProfile, profileName: string, field: string): void {
  const profileYaml = (profiles as Record<string, unknown>)[profileName] as ProfileYaml;
  ok(profileYaml.outputs);
  ok(profileYaml.outputs['dev']);
  const missingFieldResult = profile.validateProfile(profileYaml.outputs['dev']);
  assertThat(missingFieldResult, err(field));
}

export function shouldPassValidProfile(config: string, profileName: string): void {
  // arrange
  const mockDbtProject = mock(DbtProject);
  when(mockDbtProject.findProfileName()).thenReturn(profileName);
  const dbtProject = instance(mockDbtProject);

  const profileCreator = new DbtProfileCreator(dbtProject, getConfigPath(config));

  // act
  const profile = profileCreator.createDbtProfile();

  // assert
  assertThat('error' in profile, false);
}

export function sleep(ms: number): Promise<unknown> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function shouldNotProvideCompletions(completionProvider: DbtNodeCompletionProvider, jinjaPartType: JinjaPartType, text: string): void {
  const completions = completionProvider.provideCompletions(jinjaPartType, text);
  assertThat(completions, not(defined()));
}

export function shouldProvideCompletions(
  completionProvider: DbtNodeCompletionProvider,
  jinjaPartType: JinjaPartType,
  text: string,
  expectedCompletions: CompletionItem[],
): void {
  const completions = completionProvider.provideCompletions(jinjaPartType, text);
  assertCompletions(completions, expectedCompletions);
}

function assertCompletions(actualCompletions: CompletionItem[] | undefined, expectedCompletions: CompletionItem[]): void {
  assertThat(actualCompletions, defined());
  actualCompletions?.forEach((actualItem, i) => {
    const expectedCompletion = expectedCompletions[i];
    assertThat(actualItem.label, expectedCompletion.label);
    assertThat(actualItem.insertText, expectedCompletion.insertText);
  });
}
