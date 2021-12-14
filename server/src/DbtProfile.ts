export enum DbtProfileType {
  BigQuery = 'bigquery',
}

export const PROFILE_METHODS = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, ['service-account', 'service-account-json', 'oauth']]]);

export abstract class ProfileData {}

export abstract class Client {}

export interface DbtProfile {
  getDocsUrl(): string;
  getData(profile: any): ProfileData;
  validateProfile(targetConfig: any): string | undefined;
  createClient(data: ProfileData): Client;
  authenticateClient(client: Client): Promise<string | undefined>;
}
