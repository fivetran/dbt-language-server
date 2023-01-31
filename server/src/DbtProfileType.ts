import { BigQueryOAuthProfile } from './bigquery/BigQueryOAuthProfile';
import { BigQueryOAuthTokenBasedProfile } from './bigquery/BigQueryOAuthTokenBasedProfile';
import { ServiceAccountJsonProfile } from './bigquery/ServiceAccountJsonProfile';
import { ServiceAccountProfile } from './bigquery/ServiceAccountProfile';
import { DbtProfile, DbtProfileType } from './DbtProfile';
import { SnowflakeUserPassProfile } from './snowflake/SnowflakeUserPassProfile';

export const BIG_QUERY_PROFILES = new Map<string, () => DbtProfile>([
  ['oauth', (): DbtProfile => new BigQueryOAuthProfile()],
  ['oauth-secrets', (): DbtProfile => new BigQueryOAuthTokenBasedProfile()],
  ['service-account', (): DbtProfile => new ServiceAccountProfile()],
  ['service-account-json', (): DbtProfile => new ServiceAccountJsonProfile()],
]);

export const SNOWFLAKE_PROFILES = new Map<string, () => DbtProfile>([['user-password', (): DbtProfile => new SnowflakeUserPassProfile()]]);

export const PROFILE_METHODS = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, [...BIG_QUERY_PROFILES.keys()]]]);
