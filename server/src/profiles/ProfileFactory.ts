import { Client } from './Client';
import { ProfileData } from './ProfileData';
import { ProfileDataExtractor } from './ProfileDataExtractor';
import { ProfileValidator } from './ProfileValidator';

export abstract class ProfileFactory {
  abstract getDocsUrl(): string;
  abstract getProfileDataExtractor(): ProfileDataExtractor;
  abstract createClient(data: ProfileData): Client;
  abstract createValidator(): ProfileValidator;
  abstract authenticateClient(): Promise<void>;
}
