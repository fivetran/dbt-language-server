import { err, ok, Result } from 'neverthrow';
import { DbtProfile } from './DbtProfile';
import { BIG_QUERY_PROFILES, PROFILE_METHODS } from './DbtProfileType';
import { YamlParser } from './YamlParser';

export interface DbtProfileResult {
  dbtProfile: DbtProfile;
  targetConfig: any;
}

export class DbtProfileCreator {
  constructor(private yamlParser: YamlParser) {}

  validateProfilesFile(profiles: any, profileName: string): Result<void, string> {
    const profile = profiles[profileName];
    if (!profile) {
      return err(`Couldn't find credentials for profile '${profileName}'. Check your '${this.yamlParser.profilesPath}' file.`);
    }

    const { target } = profile;
    if (!target) {
      return this.cantFindSectionError(profileName, 'target');
    }

    const { outputs } = profile;
    if (!outputs) {
      return this.cantFindSectionError(profileName, 'outputs');
    }

    const outputsTarget = outputs[target];
    if (!outputsTarget) {
      return this.cantFindSectionError(profileName, `outputs.${target}`);
    }

    const { type } = outputsTarget;
    if (!type) {
      return this.cantFindSectionError(profileName, `outputs.${target}.type`);
    }

    const { method } = outputsTarget;
    const authMethods = PROFILE_METHODS.get(type);
    if (!authMethods) {
      return err(`Currently, '${type}' profile is not supported. Check your '${this.yamlParser.profilesPath}' file.`);
    }
    if (authMethods.length > 0 && (!method || authMethods.indexOf(method) === -1)) {
      return err(`Unknown authentication method of '${type}' profile. Check your '${this.yamlParser.profilesPath}' file.`);
    }

    return ok(undefined);
  }

  async createDbtProfile(): Promise<Result<DbtProfileResult, string>> {
    let profiles = undefined;
    try {
      profiles = YamlParser.parseYamlFile(this.yamlParser.profilesPath);
    } catch (e) {
      console.log(`Failed to open and parse file '${this.yamlParser.profilesPath}'. ${e}`);
      return err(`Failed to open and parse file '${this.yamlParser.profilesPath}'. ${e}`);
    }

    let profileName = undefined;
    try {
      profileName = this.yamlParser.findProfileName();
    } catch (e) {
      return err(
        `Failed to find profile name in ${YamlParser.DBT_PROJECT_FILE_NAME}. Make sure that you opened folder with ${YamlParser.DBT_PROJECT_FILE_NAME} file. ${e}`,
      );
    }
    const validationResult = this.validateProfilesFile(profiles, profileName);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    const profile = profiles[profileName];
    const { target } = profile;
    const targetConfig = profile.outputs[target];
    const { type, method } = targetConfig;

    if (![...PROFILE_METHODS.keys()].find(t => t === type)) {
      return err(`Profile type '${type}' is not supported.`);
    }

    const profileBuilder = BIG_QUERY_PROFILES.get(method);
    if (!profileBuilder) {
      return err(`Authentication method '${method}' of '${type}' profile is not supported.`);
    }

    const dbtProfile = profileBuilder();

    const result = dbtProfile.validateProfile(targetConfig);
    if (result.isErr()) {
      const docsUrl = dbtProfile.getDocsUrl();
      return this.cantFindSectionError(profileName, result.error, docsUrl);
    }

    return ok({
      dbtProfile,
      targetConfig,
    });
  }

  cantFindSectionError(profileName: string, section: string, docsUrl?: string): Result<any, string> {
    const text = `Couldn't find section '${section}' for profile '${profileName}'. Check your '${this.yamlParser.profilesPath}' file. ${
      docsUrl ?? ''
    }`;
    return err(text);
  }
}
