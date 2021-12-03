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

    return this.validateKeyFileJson(keyFileJson);
  }

  private validateKeyFileJson(keyFileJson: any): string | undefined {
    const privateKey = keyFileJson.private_key;
    if (!privateKey) {
      return 'private_key';
    }
    return undefined;
  }
}
