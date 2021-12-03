import { ProfileValidator } from '../../ProfileValidator';

export class ServiceAccountJsonValidator extends ProfileValidator {
  validateProfile(targetConfig: any): string | undefined {
    const project = targetConfig.project;
    if (!project) {
      return 'project';
    }

    const keyFileJson = targetConfig.keyFileJson;
    if (!keyFileJson) {
      return 'keyFileJson';
    }

    return undefined;
  }
}
