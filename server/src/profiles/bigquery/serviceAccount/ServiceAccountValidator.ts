import { ProfileValidator } from '../../ProfileValidator';

export class ServiceAccountValidator extends ProfileValidator {
  validateProfile(targetConfig: any): string | undefined {
    const project = targetConfig.project;
    if (!project) {
      return 'project';
    }

    const keyFilePath = targetConfig.keyfile;
    if (!keyFilePath) {
      return 'keyfile';
    }

    return undefined;
  }
}
