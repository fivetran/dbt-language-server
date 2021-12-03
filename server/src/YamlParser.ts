import * as fs from 'fs';
import * as yaml from 'yaml';
import { YamlParserUtils } from './YamlParserUtils';
import { Client } from './profiles/Client';
import { DbtProfileType, profileMethods } from './profiles/DbtProfileType';
import { ProfileFactory } from './profiles/ProfileFactory';
import { ProfileValidator } from './profiles/ProfileValidator';
import { ServiceAccountFactory } from './profiles/bigquery/serviceAccount/ServiceAccountFactory';
import { ServiceAccountJsonFactory } from './profiles/bigquery/serviceAccountJson/ServiceAccountJsonFactory';
import { OAuthFactory } from './profiles/bigquery/oauth/OAuthFactory';

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
    if (!profileMethods.has(type)) {
      return YamlParser.errorResult(`Currently, '${type}' profile is not supported. Check your '${this.profilesPath}' file.`);
    } else {
      const method = outputsTarget.method;
      const authMethods = profileMethods.get(type);
      if (authMethods && authMethods.length > 0 && (!method || authMethods.indexOf(method) == -1)) {
        return YamlParser.errorResult(`Unknown authentication method of '${type}' profile. Check your '${this.profilesPath}' file.`);
      }
    }

    return undefined;
  }

  createDbtProfile(): DbtProfileResult {
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

    let profileFactory: ProfileFactory;

    switch (type) {
      case DbtProfileType.BigQuery:
        switch (method) {
          case 'service-account':
            profileFactory = new ServiceAccountFactory();
            break;
          case 'service-account-json':
            profileFactory = new ServiceAccountJsonFactory();
            break;
          case 'oauth':
            profileFactory = new OAuthFactory();
            break;
          default:
            return YamlParser.errorResult(`Invalid profile validation. Authentication method '${method}' of '${type}' profile is not supported`);
        }
        break;
      default:
        return YamlParser.errorResult(`Invalid profile validation. Profile type '${type}' is not supported.`);
    }

    const profileValidator: ProfileValidator = profileFactory.createValidator();
    const result = profileValidator.validateProfile(targetConfig);
    if (result !== undefined) {
      const docsUrl = profileFactory.getDocsUrl();
      return this.cantFindSectionError(profileName, result, docsUrl);
    }

    const profileDataExtractor = profileFactory.getProfileDataExtractor();
    const profileData = profileDataExtractor.getData(targetConfig);
    const client = profileFactory.createClient(profileData);

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
