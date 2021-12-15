import { OAuthProfile } from './bigquery/OAuthProfile';
import { ServiceAccountProfile } from './bigquery/ServiceAccountProfile';
import { ServiceAccountJsonProfile } from './bigquery/ServiceAccountJsonProfile';

export enum DbtProfileType {
  BigQuery = 'bigquery',
}

export const BIG_QUERY_PROFILES = new Map<string, () => DbtProfile>([
  ['oauth', OAuthProfile.createProfile],
  ['service-account', ServiceAccountProfile.createProfile],
  ['service-account-json', ServiceAccountJsonProfile.createProfile],
]);

export const PROFILE_METHODS = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, [...BIG_QUERY_PROFILES.keys()]]]);

export abstract class Client {}

export interface DbtProfile {
  getDocsUrl(): string;

  /**
   * Validate dbt profile according to specified type and authentication method
   * @param targetConfig target config specified in profiles.yml
   * @returns error message or undefined if profile is valid
   */
  validateProfile(targetConfig: any): string | undefined;
  createClient(profile: any): Client;

  /**
   * Establish connection with destination
   * @param client profile client
   * @returns undefined in case of authentication success and error string otherwise
   */
  authenticateClient(client: Client): Promise<string | undefined>;
}
