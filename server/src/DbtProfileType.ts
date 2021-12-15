import { DbtProfile } from './DbtProfile';
import { OAuthProfile } from './bigquery/OAuthProfile';
import { ServiceAccountProfile } from './bigquery/ServiceAccountProfile';
import { ServiceAccountJsonProfile } from './bigquery/ServiceAccountJsonProfile';

export enum DbtProfileType {
  BigQuery = 'bigquery',
}

const createOAuthProfile: () => DbtProfile = () => new OAuthProfile();
const createServiceAccountJsonProfile: () => DbtProfile = () => new ServiceAccountJsonProfile();
const createServiceAccountProfile: () => DbtProfile = () => new ServiceAccountProfile();

export const BIG_QUERY_PROFILES = new Map<string, () => DbtProfile>([
  ['oauth', createOAuthProfile],
  ['service-account-json', createServiceAccountJsonProfile],
  ['service-account', createServiceAccountProfile],
]);

export const PROFILE_METHODS = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, [...BIG_QUERY_PROFILES.keys()]]]);
