import { ProfileValidator } from '../../ProfileValidator';

export class OAuthValidator extends ProfileValidator {
  validateProfile(targetConfig: any): string | undefined {
    const project = targetConfig.project;
    if (!project) {
      return 'project';
    }

    return undefined;
  }
}
