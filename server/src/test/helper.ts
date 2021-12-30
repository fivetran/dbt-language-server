import * as path from 'path';
import { YamlParser } from '../YamlParser';

const PROFILES_PATH = path.resolve(__dirname, '../../src/test/profiles');

export const BIG_QUERY_CONFIG = 'bigquery.yml';

export const BIG_QUERY_OAUTH = 'bigquery-test_oauth';
export const BIG_QUERY_OAUTH_TEMPORARY = 'bigquery-test_oauth_temporary';
export const BIG_QUERY_OAUTH_REFRESH = 'bigquery-test_oauth_refresh';
export const BIG_QUERY_SERVICE_ACCOUNT = 'bigquery-test_service_account';
export const BIG_QUERY_SERVICE_ACCOUNT_JSON = 'bigquery-test_service_account_json';
export const BIG_QUERY_MISSING_TYPE = 'bigquery-test_missing_type';
export const BIG_QUERY_MISSING_METHOD = 'bigquery-test_missing_method';
export const BIG_QUERY_MISSING_PROJECT = 'bigquery-test_missing_project';

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
