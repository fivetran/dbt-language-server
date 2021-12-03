import { ProfileDataExtractor } from '../../ProfileDataExtractor';
import { ProfileData } from '../../ProfileData';
import { OAuthData } from './OAuthData';

export class OAuthDataExtractor extends ProfileDataExtractor {
  getData(profile: any): ProfileData {
    const project = profile.project;
    return new OAuthData(project);
  }
}
