import { YamlParserUtils } from '../../../YamlParserUtils';
import { ProfileDataExtractor } from '../../ProfileDataExtractor';
import { ProfileData } from '../../ProfileData';
import { ServiceAccountData } from './ServiceAccountData';

export class ServiceAccountDataExtractor extends ProfileDataExtractor {
  getData(profile: any): ProfileData {
    const project = profile.project;
    const keyFilePath = YamlParserUtils.replaceTilde(profile.keyfile);
    return new ServiceAccountData(project, keyFilePath);
  }
}
