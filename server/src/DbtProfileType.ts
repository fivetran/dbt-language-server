import { OAuthProfile } from './bigquery/OAuthProfile';
import { OAuthTokenBasedProfile } from './bigquery/OAuthTokenBasedProfile';
import { ServiceAccountJsonProfile } from './bigquery/ServiceAccountJsonProfile';
import { ServiceAccountProfile } from './bigquery/ServiceAccountProfile';
import { DbtProfile, DbtProfileType } from './DbtProfile';
import { SnowflakeUserPassProfile } from './snowflake/SnowflakeUserPassProfile';

export const BIG_QUERY_PROFILES = new Map<string, () => DbtProfile>([
  ['oauth', (): DbtProfile => new OAuthProfile()],
  ['oauth-secrets', (): DbtProfile => new OAuthTokenBasedProfile()],
  ['service-account', (): DbtProfile => new ServiceAccountProfile()],
  ['service-account-json', (): DbtProfile => new ServiceAccountJsonProfile()],
]);

export const SNOWFLAKE_PROFILES = new Map<string, () => DbtProfile>([['user-password', (): DbtProfile => new SnowflakeUserPassProfile()]]);

export const PROFILE_METHODS = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, [...BIG_QUERY_PROFILES.keys()]]]);
