import { Result } from 'neverthrow';
import { DbtDestinationClient } from './DbtDestinationClient';

export interface DbtProfile {
  /**
   * @returns url with dbt profile setup docs
   */
  getDocsUrl(): string;

  /**
   * Validates dbt profile according to specified type and authentication method
   * @param targetConfig target config specified in profiles.yml
   * @returns Err with missing field or Ok if profile is valid
   */
  validateProfile(targetConfig: TargetConfig): Result<void, string>;

  /**
   * Creates destination client according to dbt profile settings
   * @param profile profile specified in profiles.yml
   * @returns authenticated client or error string otherwise
   */
  createClient(profile: unknown): Promise<Result<DbtDestinationClient, string>>;
}

export interface ProfileYaml {
  target?: string;
  outputs?: Partial<Record<string, TargetConfig>>;
}

export interface TargetConfig {
  type?: DbtProfileType;
  method?: string;
  project?: string;
  token?: string;
  refresh_token?: string;
  client_id?: string;
  client_secret?: string;
  keyfile_json?: {
    private_key?: string;
  };
  keyfile?: string;
  scopes?: string[];
  account?: string;
  password?: string;
  private_key_path?: string;
  private_key_passphrase?: string;
}

export enum DbtProfileType {
  BigQuery = 'bigquery',
  Snowflake = 'snowflake',
}
