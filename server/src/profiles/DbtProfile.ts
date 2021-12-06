import { ProfileData } from './ProfileData';
import { Client } from './Client';

export abstract class DbtProfile {
  abstract getDocsUrl(): string;
  abstract getData(profile: any): ProfileData;
  abstract validateProfile(targetConfig: any): string | undefined;
  abstract createClient(data: ProfileData): Client;
  abstract authenticateClient(): Promise<void>;
}
