import { OAuthProfile } from './bigquery/oauth/OAuthProfile';
import { ServiceAccountProfile } from './bigquery/serviceAccount/ServiceAccountProfile';
import { ServiceAccountJsonProfile } from './bigquery/serviceAccountJson/ServiceAccountJsonProfile';

export enum DbtProfileType {
  BigQuery = 'bigquery',
}

export const BIG_QUERY_PROFILES = new Map<string, () => DbtProfile>([
  ['oauth', OAuthProfile.createProfile],
  ['service-account', ServiceAccountProfile.createProfile],
  ['service-account-json', ServiceAccountJsonProfile.createProfile],
]);

export const PROFILE_METHODS = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, [...BIG_QUERY_PROFILES.keys()]]]);

export abstract class ProfileData {}

export abstract class Client {}

export interface DbtProfile {
  getDocsUrl(): string;
  getData(profile: any): ProfileData;
  /**
   * Validate dbt profile according to specified type and authentication method
   * @param targetConfig target config specified in profiles.yml
   * @returns error message or undefined if profile is valid
   */
  validateProfile(targetConfig: any): string | undefined;
  createClient(data: ProfileData): Client;
  authenticateClient(client: Client): Promise<string | undefined>;
}
