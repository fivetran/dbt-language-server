import { DbtDestinationProfile } from './DbtDestinationProfile';
import { OAuthProfile } from './bigquery/OAuthProfile';
import { OAuthTokenBasedProfile } from './bigquery/OAuthTokenBasedProfile';
import { ServiceAccountProfile } from './bigquery/ServiceAccountProfile';
import { ServiceAccountJsonProfile } from './bigquery/ServiceAccountJsonProfile';

export enum DbtProfileType {
  BigQuery = 'bigquery',
}

const createOAuthProfile: () => DbtDestinationProfile = () => new OAuthProfile();
const createOAuthTokenBasedProfile: () => DbtDestinationProfile = () => new OAuthTokenBasedProfile();
const createServiceAccountProfile: () => DbtDestinationProfile = () => new ServiceAccountProfile();
const createServiceAccountJsonProfile: () => DbtDestinationProfile = () => new ServiceAccountJsonProfile();

export const BIG_QUERY_PROFILES = new Map<string, () => DbtDestinationProfile>([
  ['oauth', createOAuthProfile],
  ['oauth-secrets', createOAuthTokenBasedProfile],
  ['service-account', createServiceAccountProfile],
  ['service-account-json', createServiceAccountJsonProfile],
]);

export const PROFILE_METHODS = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, [...BIG_QUERY_PROFILES.keys()]]]);
