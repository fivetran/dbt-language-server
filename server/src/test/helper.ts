import * as path from 'path';
import { YamlParser } from '../YamlParser';

const PROFILES_PATH = path.resolve(__dirname, '../../src/test/profiles');

export const BIG_QUERY_CONFIG = 'bigquery.yml';

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

export function getMockParser(config: string, profileName: string): YamlParser {
  const yamlParser = new YamlParser();
  yamlParser.profilesPath = getConfigPath(config);
  yamlParser.findProfileName = (): string => {
    return profileName;
  };
  return yamlParser;
}

export function getConfigPath(p: string): string {
  return path.resolve(PROFILES_PATH, p);
}
