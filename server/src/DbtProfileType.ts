import { BigQueryOAuthProfile } from './bigquery/BigQueryOAuthProfile';
import { BigQueryOAuthTokenBasedProfile } from './bigquery/BigQueryOAuthTokenBasedProfile';
import { BigQueryServiceAccountJsonProfile } from './bigquery/BigQueryServiceAccountJsonProfile';
import { BigQueryServiceAccountProfile } from './bigquery/BigQueryServiceAccountProfile';
import { DbtProfile, DbtProfileType } from './DbtProfile';
import { SnowflakeKeyPairProfile } from './snowflake/SnowflakeKeyPairProfile';
import { SnowflakeUserPassProfile } from './snowflake/SnowflakeUserPassProfile';

export const BIG_QUERY_PROFILES = new Map<string, () => DbtProfile>([
  ['oauth', (): DbtProfile => new BigQueryOAuthProfile()],
  ['oauth-secrets', (): DbtProfile => new BigQueryOAuthTokenBasedProfile()],
  ['service-account', (): DbtProfile => new BigQueryServiceAccountProfile()],
  ['service-account-json', (): DbtProfile => new BigQueryServiceAccountJsonProfile()],
]);

export const SNOWFLAKE_PROFILES = new Map<string, () => DbtProfile>([
  ['user-password', (): DbtProfile => new SnowflakeUserPassProfile()],
  ['key-pair', (): DbtProfile => new SnowflakeKeyPairProfile()],
]);

export const PROFILE_METHODS = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, [...BIG_QUERY_PROFILES.keys()]]]);
