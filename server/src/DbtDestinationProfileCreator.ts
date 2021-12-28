import { DbtDestinationClient } from './DbtDestinationClient';
import { YamlParser } from './YamlParser';
import { BIG_QUERY_PROFILES, PROFILE_METHODS } from './DbtDestinationProfileType';
import { DbtDestinationProfile } from './DbtDestinationProfile';

export interface DbtProfileResult {
  dbtProfile?: DbtDestinationProfile;
  targetConfig?: any;
  error?: string;
}

export interface DbtClientResult {
  client?: DbtDestinationClient;
  error?: string;
}

export class DbtDestinationProfileCreator {
  yamlParser: YamlParser;

  constructor(yamlParser?: YamlParser) {
    this.yamlParser = yamlParser ?? new YamlParser();
  }

  validateProfilesFile(profiles: any, profileName: string): DbtProfileResult | undefined {
    const profile = profiles[profileName];
    if (!profile) {
      return DbtDestinationProfileCreator.errorResult(
        `Couldn't find credentials for profile '${profileName}'. Check your '${this.yamlParser.profilesPath}' file.`,
      );
    }

    const target = profile.target;
    if (!target) {
      return this.cantFindSectionError(profileName, 'target');
    }

    const outputs = profile.outputs;
    if (!outputs) {
      return this.cantFindSectionError(profileName, 'outputs');
    }

    const outputsTarget = outputs[target];
    if (!outputsTarget) {
      return this.cantFindSectionError(profileName, `outputs.${target}`);
    }

    const type = outputsTarget.type;
    if (!type) {
      return this.cantFindSectionError(profileName, `outputs.${target}.type`);
    }

    const method = outputsTarget.method;
    const authMethods = PROFILE_METHODS.get(type);
    if (authMethods) {
      if (authMethods.length > 0 && (!method || authMethods.indexOf(method) == -1)) {
        return DbtDestinationProfileCreator.errorResult(
          `Unknown authentication method of '${type}' profile. Check your '${this.yamlParser.profilesPath}' file.`,
        );
      }
    } else {
      return DbtDestinationProfileCreator.errorResult(
        `Currently, '${type}' profile is not supported. Check your '${this.yamlParser.profilesPath}' file.`,
      );
    }

    return undefined;
  }

  async createDbtProfile(): Promise<DbtProfileResult> {
    let profiles = undefined;
    try {
      profiles = YamlParser.parseYamlFile(this.yamlParser.profilesPath);
    } catch (e) {
      console.log(`Failed to open and parse file '${this.yamlParser.profilesPath}'. ${e}`);
      return DbtDestinationProfileCreator.errorResult(`Failed to open and parse file '${this.yamlParser.profilesPath}'. ${e}`);
    }

    let profileName = undefined;
    try {
      profileName = this.yamlParser.findProfileName();
    } catch (e) {
      return DbtDestinationProfileCreator.errorResult(
        `Failed to find profile name in ${YamlParser.DBT_PROJECT_FILE_NAME}. Make sure that you opened folder with ${YamlParser.DBT_PROJECT_FILE_NAME} file. ${e}`,
      );
    }
    const validationResult = this.validateProfilesFile(profiles, profileName);
    if (validationResult) {
      return validationResult;
    }

    const profile = profiles[profileName];
    const target = profile.target;
    const targetConfig = profile.outputs[target];
    const type = targetConfig.type;
    const method = targetConfig.method;

    if (![...PROFILE_METHODS.keys()].find(t => t === type)) {
      return DbtDestinationProfileCreator.errorResult(`Profile type '${type}' is not supported.`);
    }

    const profileBuilder = BIG_QUERY_PROFILES.get(method);
    if (!profileBuilder) {
      return DbtDestinationProfileCreator.errorResult(`Authentication method '${method}' of '${type}' profile is not supported.`);
    }

    const dbtProfile = profileBuilder();

    const result = dbtProfile.validateProfile(targetConfig);
    if (result !== undefined) {
      const docsUrl = dbtProfile.getDocsUrl();
      return this.cantFindSectionError(profileName, result, docsUrl);
    }

    return {
      dbtProfile: dbtProfile,
      targetConfig: targetConfig,
    };
  }

  async createDbtClient(dbtProfile: DbtDestinationProfile, targetConfig: any): Promise<DbtClientResult> {
    const client = dbtProfile.createClient(targetConfig);
    const authenticateResult = await dbtProfile.authenticateClient(client);
    if (authenticateResult) {
      return {
        client: undefined,
        error: authenticateResult,
      };
    }

    return {
      client: client,
    };
  }

  cantFindSectionError(profileName: string, section: string, docsUrl?: string): DbtProfileResult {
    const text = `Couldn't find section '${section}' for profile '${profileName}'. Check your '${this.yamlParser.profilesPath}' file. ${
      docsUrl ?? ''
    }`;
    return DbtDestinationProfileCreator.errorResult(text);
  }

  static errorResult(text: string): {
    error: string;
  } {
    return {
      error: text,
    };
  }
}
