import * as fs from 'fs';
import * as yaml from 'yaml';
import { YamlParserUtils } from './YamlParserUtils';
import { BIG_QUERY_PROFILES, PROFILE_METHODS } from './DbtProfile';
import { Client } from './DbtProfile';

export interface DbtProfileResult {
  client?: Client;
  error?: string;
}

export class YamlParser {
  static readonly DBT_PROJECT_FILE_NAME = 'dbt_project.yml';
  static readonly TARGET_PATH_FIELD = 'target-path';
  static readonly DEFAULT_TARGET_PATH = './target';

  profilesPath: string;

  constructor(profilesPath?: string) {
    const path = profilesPath ?? '~/.dbt/profiles.yml';
    this.profilesPath = YamlParserUtils.replaceTilde(path);
  }

  findTargetPath(): string {
    try {
      const dbtProject = YamlParser.parseYamlFile(YamlParser.DBT_PROJECT_FILE_NAME);
      return dbtProject[YamlParser.TARGET_PATH_FIELD] ?? YamlParser.DEFAULT_TARGET_PATH;
    } catch (e) {
      return YamlParser.DEFAULT_TARGET_PATH;
    }
  }

  findProfileName(): string {
    const dbtProject = YamlParser.parseYamlFile(YamlParser.DBT_PROJECT_FILE_NAME);
    console.log(`Profile name found: ${dbtProject?.profile}`);
    return dbtProject?.profile;
  }

  validateProfilesFile(profiles: any, profileName: string): DbtProfileResult | undefined {
    const profile = profiles[profileName];
    if (!profile) {
      return YamlParser.errorResult(`Couldn't find credentials for profile '${profileName}'. Check your '${this.profilesPath}' file.`);
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
        return YamlParser.errorResult(`Unknown authentication method of '${type}' profile. Check your '${this.profilesPath}' file.`);
      }
    } else {
      return YamlParser.errorResult(`Currently, '${type}' profile is not supported. Check your '${this.profilesPath}' file.`);
    }

    return undefined;
  }

  async createDbtProfile(): Promise<DbtProfileResult> {
    let profiles = undefined;
    try {
      profiles = YamlParser.parseYamlFile(this.profilesPath);
    } catch (e) {
      console.log(`Failed to open and parse file '${this.profilesPath}'. ${e}`);
      return YamlParser.errorResult(`Failed to open and parse file '${this.profilesPath}'. ${e}`);
    }

    let profileName = undefined;
    try {
      profileName = this.findProfileName();
    } catch (e) {
      return YamlParser.errorResult(
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
      return YamlParser.errorResult(`Profile type '${type}' is not supported.`);
    }

    const profileBuilder = BIG_QUERY_PROFILES.get(method);
    if (!profileBuilder) {
      return YamlParser.errorResult(`Authentication method '${method}' of '${type}' profile is not supported.`);
    }

    const dbtProfile = profileBuilder();

    const result = dbtProfile.validateProfile(targetConfig);
    if (result !== undefined) {
      const docsUrl = dbtProfile.getDocsUrl();
      return this.cantFindSectionError(profileName, result, docsUrl);
    }

    const profileData = dbtProfile.getData(targetConfig);
    const client = dbtProfile.createClient(profileData);
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
    const text = docsUrl
      ? `Couldn't find section '${section}' for profile '${profileName}'. Check your '${this.profilesPath}' file. ${docsUrl}`
      : `Couldn't find section '${section}' for profile '${profileName}'. Check your '${this.profilesPath}' file.`;
    return YamlParser.errorResult(text);
  }

  static errorResult(text: string): {
    error: string;
  } {
    return {
      error: text,
    };
  }

  static parseYamlFile(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(content, { uniqueKeys: false });
  }
}
