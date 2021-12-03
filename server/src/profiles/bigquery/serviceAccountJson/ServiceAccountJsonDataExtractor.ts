import { ProfileDataExtractor } from '../../ProfileDataExtractor';
import { ProfileData } from '../../ProfileData';
import { ServiceAccountJsonData } from './ServiceAccountJsonData';

export class ServiceAccountJsonDataExtractor extends ProfileDataExtractor {
  getData(profile: any): ProfileData {
    const project = profile.project;
    const keyFileJson = JSON.stringify(profile.keyfile_json);
    return new ServiceAccountJsonData(project, keyFileJson);
  }
}
