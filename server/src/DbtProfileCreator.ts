import { DbtDestinationClient } from './DbtDestinationClient';
import { DbtProfile } from './DbtProfile';
import { BIG_QUERY_PROFILES, PROFILE_METHODS } from './DbtProfileType';
import { YamlParser } from './YamlParser';

export interface ErrorResult {
  error: string;
}

export interface DbtProfileSuccessfulResult {
  dbtProfile: DbtProfile;
  targetConfig: any;
}

export type DbtProfileResult = DbtProfileSuccessfulResult | ErrorResult;

export interface DbtClientSuccessfulResult {
  client: DbtDestinationClient;
}

export type DbtClientResult = DbtClientSuccessfulResult | ErrorResult;

export class DbtProfileCreator {
  constructor(private yamlParser: YamlParser) {}

  validateProfilesFile(profiles: any, profileName: string): ErrorResult | undefined {
    const profile = profiles[profileName];
    if (!profile) {
      return DbtProfileCreator.errorResult(
        `Couldn't find credentials for profile '${profileName}'. Check your '${this.yamlParser.profilesPath}' file.`,
      );
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
      return DbtProfileCreator.errorResult(`Currently, '${type}' profile is not supported. Check your '${this.yamlParser.profilesPath}' file.`);
    }
    if (authMethods.length > 0 && (!method || authMethods.indexOf(method) === -1)) {
      return DbtProfileCreator.errorResult(`Unknown authentication method of '${type}' profile. Check your '${this.yamlParser.profilesPath}' file.`);
    }

    return undefined;
  }

  async createDbtProfile(): Promise<DbtProfileResult> {
    let profiles = undefined;
    try {
      profiles = YamlParser.parseYamlFile(this.yamlParser.profilesPath);
    } catch (e) {
      console.log(`Failed to open and parse file '${this.yamlParser.profilesPath}'. ${e}`);
      return DbtProfileCreator.errorResult(`Failed to open and parse file '${this.yamlParser.profilesPath}'. ${e}`);
    }

    let profileName = undefined;
    try {
      profileName = this.yamlParser.findProfileName();
    } catch (e) {
      return DbtProfileCreator.errorResult(
        `Failed to find profile name in ${YamlParser.DBT_PROJECT_FILE_NAME}. Make sure that you opened folder with ${YamlParser.DBT_PROJECT_FILE_NAME} file. ${e}`,
      );
    }
    const validationResult = this.validateProfilesFile(profiles, profileName);
    if (validationResult) {
      return validationResult;
    }

    const profile = profiles[profileName];
    const { target } = profile;
    const targetConfig = profile.outputs[target];
    const { type, method } = targetConfig;

    if (![...PROFILE_METHODS.keys()].find(t => t === type)) {
      return DbtProfileCreator.errorResult(`Profile type '${type}' is not supported.`);
    }

    const profileBuilder = BIG_QUERY_PROFILES.get(method);
    if (!profileBuilder) {
      return DbtProfileCreator.errorResult(`Authentication method '${method}' of '${type}' profile is not supported.`);
    }

    const dbtProfile = profileBuilder();

    const result = dbtProfile.validateProfile(targetConfig);
    if (result !== undefined) {
      const docsUrl = dbtProfile.getDocsUrl();
      return this.cantFindSectionError(profileName, result, docsUrl);
    }

    return {
      dbtProfile,
      targetConfig,
    };
  }

  async createDbtClient(dbtProfile: DbtProfile, targetConfig: any): Promise<DbtClientResult> {
    const client = await dbtProfile.createClient(targetConfig);
    if (typeof client === 'string') {
      return {
        error: client,
      };
    }

    return {
      client,
    };
  }

  cantFindSectionError(profileName: string, section: string, docsUrl?: string): ErrorResult {
    const text = `Couldn't find section '${section}' for profile '${profileName}'. Check your '${this.yamlParser.profilesPath}' file. ${
      docsUrl ?? ''
    }`;
    return DbtProfileCreator.errorResult(text);
  }

  static errorResult(text: string): ErrorResult {
    return {
      error: text,
    };
  }
}
