import { DbtDestinationClient } from './DbtDestinationClient';

export interface DbtProfile {
  /**
   * @returns url with dbt profile setup docs
   */
  getDocsUrl(): string;

  /**
   * Validates dbt profile according to specified type and authentication method
   * @param targetConfig target config specified in profiles.yml
   * @returns error message or undefined if profile is valid
   */
  validateProfile(targetConfig: any): string | undefined;

  /**
   * Creates destination client according to dbt profile settings
   * @param profile profile specified in profiles.yml
   * @returns authenticated client or error string otherwise
   */
  createClient(profile: any): Promise<DbtDestinationClient | string>;
}
