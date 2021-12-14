export enum DbtProfileType {
  BigQuery = 'bigquery',
}

export const profileMethods = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, ['service-account', 'service-account-json', 'oauth']]]);

export abstract class ProfileData {}

export abstract class Client {}

export abstract class DbtProfile {
  abstract getDocsUrl(): string;
  abstract getData(profile: any): ProfileData;
  abstract validateProfile(targetConfig: any): string | undefined;
  abstract createClient(data: ProfileData): Client;
  abstract authenticateClient(client: Client): Promise<string | undefined>;
}
