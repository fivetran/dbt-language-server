import * as fs from 'fs';
import { homedir } from 'os';
import * as yaml from 'yaml';

export interface FindCredentialsResult {
  credentials?: ServiceAccountCredentials | ServiceAccountJsonCredentials;
  error?: string;
}

export enum AuthenticationMethod {
  ServiceAccount = 'service-account',
  ServiceAccountJson = 'service-account-json',
}

export interface Credentials {
  project: string;
  method: AuthenticationMethod;
}

export interface ServiceAccountCredentials extends Credentials {
  keyFilePath: string;
}

export interface ServiceAccountJsonCredentials extends Credentials {
  keyFileJson: string;
}

export class YamlParser {
  static readonly DBT_PROJECT_FILE_NAME = 'dbt_project.yml';
  static readonly TARGET_PATH_FIELD = 'target-path';
  static readonly DEFAULT_TARGET_PATH = './target';
  static readonly BQ_SERVICE_ACCOUNT_FILE_DOCS =
    '[Service Account File configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file).';
  static readonly BQ_SERVICE_ACCOUNT_JSON_DOCS =
    '[Service Account JSON configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json).';

  profilesPath: string;

  constructor(profilesPath?: string) {
    const path = profilesPath ?? '~/.dbt/profiles.yml';
    this.profilesPath = this.replaceTilde(path);
  }

  findTargetPath(): string {
    try {
      const dbtProject = this.parseYamlFile(YamlParser.DBT_PROJECT_FILE_NAME);
      return dbtProject[YamlParser.TARGET_PATH_FIELD] ?? YamlParser.DEFAULT_TARGET_PATH;
    } catch (e) {
      return YamlParser.DEFAULT_TARGET_PATH;
    }
  }

  findProfileName(): string {
    const dbtProject = this.parseYamlFile(YamlParser.DBT_PROJECT_FILE_NAME);
    console.log(`Profile name found: ${dbtProject?.profile}`);
    return dbtProject?.profile;
  }

  validateBQServiceAccountFile(profiles: any, profileName: string): FindCredentialsResult | undefined {
    const profile = profiles[profileName];
    if (!profile) {
      return this.errorResult(
        `Couldn't find credentials for profile '${profileName}'. Check your '${this.profilesPath}' file. ${YamlParser.BQ_SERVICE_ACCOUNT_FILE_DOCS}`,
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

    const validationResult = this.validateRequiredFieldsInOutputsTarget(profileName, target, outputsTarget, ['type', 'method']);
    if (validationResult) {
      return validationResult;
    }

    const method = outputsTarget['method'];
    const methodRequiredFields = [];
    if (method == AuthenticationMethod.ServiceAccount) {
      methodRequiredFields.push('keyfile');
    } else if (method == AuthenticationMethod.ServiceAccountJson) {
      methodRequiredFields.push('keyfile_json');
    }
    const methodValidationResult = this.validateRequiredFieldsInOutputsTarget(profileName, target, outputsTarget, methodRequiredFields);
    if (methodValidationResult) {
      return methodValidationResult;
    }

    if (outputsTarget.type !== 'bigquery') {
      return this.errorResult(
        `Currently, only BigQuery service account credentials are supported. Check your '${this.profilesPath}' file. ${YamlParser.BQ_SERVICE_ACCOUNT_FILE_DOCS}`,
      );
    }

    return undefined;
  }

  validateRequiredFieldsInOutputsTarget(
    profileName: string,
    target: string,
    outputsTarget: any,
    fields: string[],
  ): FindCredentialsResult | undefined {
    for (const field of fields) {
      const value = outputsTarget[field];
      if (!value) {
        return this.cantFindSectionError(profileName, `outputs.${target}.${field}`);
      }
    }

    return undefined;
  }

  cantFindSectionError(profileName: string, section: string): FindCredentialsResult {
    return this.errorResult(
      `Couldn't find section '${section}' for profile '${profileName}'. Check your '${this.profilesPath}' file. ${YamlParser.BQ_SERVICE_ACCOUNT_FILE_DOCS}`,
    );
  }

  findProfileCredentials(): FindCredentialsResult {
    let profiles = undefined;
    try {
      profiles = this.parseYamlFile(this.profilesPath);
    } catch (e) {
      console.log(`Failed to open and parse file '${this.profilesPath}'. ${e}`);
      return this.errorResult(`Failed to open and parse file '${this.profilesPath}'. ${e}`);
    }

    let profileName = undefined;
    try {
      profileName = this.findProfileName();
    } catch (e) {
      return this.errorResult(
        `Failed to find profile name in ${YamlParser.DBT_PROJECT_FILE_NAME}. Make sure that you opened folder with ${YamlParser.DBT_PROJECT_FILE_NAME} file. ${e}`,
      );
    }
    const validationResult = this.validateBQServiceAccountFile(profiles, profileName);
    if (validationResult) {
      return validationResult;
    }

    const profile = profiles[profileName];
    const target = profile.target;
    const targetConfig = profile.outputs[target];
    if (targetConfig.method === AuthenticationMethod.ServiceAccount) {
      return {
        credentials: {
          project: targetConfig.project,
          keyFilePath: this.replaceTilde(targetConfig.keyfile),
          method: AuthenticationMethod.ServiceAccount,
        },
      };
    } else if (targetConfig.method === AuthenticationMethod.ServiceAccountJson) {
      return {
        credentials: {
          project: targetConfig.project,
          keyFileJson: JSON.stringify(targetConfig.keyfile_json),
          method: AuthenticationMethod.ServiceAccountJson,
        },
      };
    }

    const docsUrl =
      targetConfig.method === AuthenticationMethod.ServiceAccount
        ? YamlParser.BQ_SERVICE_ACCOUNT_FILE_DOCS
        : targetConfig.method === AuthenticationMethod.ServiceAccountJson
        ? YamlParser.BQ_SERVICE_ACCOUNT_JSON_DOCS
        : '';
    return this.errorResult(`Currently only BigQuery service account credentials supported. Check your '${this.profilesPath}'. ${docsUrl}`);
  }

  errorResult(text: string): {
    error: string;
  } {
    return {
      error: text,
    };
  }

  parseYamlFile(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(content, { uniqueKeys: false });
  }

  replaceTilde(path: string): string {
    return path.replace('~', homedir());
  }
}
