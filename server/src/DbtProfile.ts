export abstract class Client {}

export interface DbtProfile {
  getDocsUrl(): string;

  /**
   * Validates dbt profile according to specified type and authentication method
   * @param targetConfig target config specified in profiles.yml
   * @returns error message or undefined if profile is valid
   */
  validateProfile(targetConfig: any): string | undefined;
  createClient(profile: any): Client;

  /**
   * Authenticates client
   * @param client profile client
   * @returns undefined in case of authentication success and error string otherwise
   */
  authenticateClient(client: Client): Promise<string | undefined>;
}
