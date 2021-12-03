import { ProfileData } from './ProfileData';

export abstract class ProfileDataExtractor {
  abstract getData(profile: any): ProfileData;
}
