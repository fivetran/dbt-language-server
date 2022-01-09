import { OAuthProfile } from './bigquery/OAuthProfile';
import { OAuthTokenBasedProfile } from './bigquery/OAuthTokenBasedProfile';
import { ServiceAccountJsonProfile } from './bigquery/ServiceAccountJsonProfile';
import { ServiceAccountProfile } from './bigquery/ServiceAccountProfile';
import { DbtProfile } from './DbtProfile';

export enum DbtProfileType {
  BigQuery = 'bigquery',
}

const createOAuthProfile: () => DbtProfile = () => new OAuthProfile();
const createOAuthTokenBasedProfile: () => DbtProfile = () => new OAuthTokenBasedProfile();
const createServiceAccountProfile: () => DbtProfile = () => new ServiceAccountProfile();
const createServiceAccountJsonProfile: () => DbtProfile = () => new ServiceAccountJsonProfile();

export const BIG_QUERY_PROFILES = new Map<string, () => DbtProfile>([
  ['oauth', createOAuthProfile],
  ['oauth-secrets', createOAuthTokenBasedProfile],
  ['service-account', createServiceAccountProfile],
  ['service-account-json', createServiceAccountJsonProfile],
]);

export const PROFILE_METHODS = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, [...BIG_QUERY_PROFILES.keys()]]]);
