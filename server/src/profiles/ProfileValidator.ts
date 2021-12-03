export abstract class ProfileValidator {
  abstract validateProfile(targetConfig: any): string | undefined;
}
