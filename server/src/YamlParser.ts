import * as fs from 'fs';
import { homedir } from 'os';
import * as yaml from 'yaml';

export interface FindCredsResult {
  creds?: ServiceAccountCreds;
  error?: string;
}

export interface ServiceAccountCreds {
  project: string;
  keyFile: string;
}

export class YamlParser {
  static readonly DBT_PROJECT_FILE_NAME = 'dbt_project.yml';
  static readonly TARGET_PATH_FIELD = 'target-path';
  static readonly DEFAULT_TARGET_PATH = './target';
  static readonly BQ_SERVICE_ACCOUNT_FILE_DOCS =
    '[Service Account File configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file).';

  profilesPath: string;

  constructor(profilesPath?: string) {
    const path = profilesPath ?? '~/.dbt/profiles.yml';
    this.profilesPath = this.replaceTilde(path);
  }

  findTargetPath(): string {
    let dbtProject;
    try {
      dbtProject = this.parseYamlFile(YamlParser.DBT_PROJECT_FILE_NAME);
    } catch (e) {
      return YamlParser.DEFAULT_TARGET_PATH;
    }
    return dbtProject[YamlParser.TARGET_PATH_FIELD] ?? YamlParser.DEFAULT_TARGET_PATH;
  }

  findProfileName(): string {
    const dbtProject = this.parseYamlFile(YamlParser.DBT_PROJECT_FILE_NAME);
    console.log(`Profile name found: ${dbtProject?.profile}`);
    return dbtProject?.profile;
  }

  validateBQServiceAccountFile(profiles: any, profileName: string): FindCredsResult | undefined {
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

    const validationResult = this.validateRequiredFieldsInOtuputsTarget(profileName, target, outputsTarget, ['type', 'method', 'keyfile']);
    if (validationResult) {
      return validationResult;
    }

    if (outputsTarget.type !== 'bigquery') {
      return this.errorResult(
        `Currently, only BigQuery service account credentials are supported. Check your '${this.profilesPath}' file. ${YamlParser.BQ_SERVICE_ACCOUNT_FILE_DOCS}`,
      );
    }
  }

  validateRequiredFieldsInOtuputsTarget(profileName: string, target: string, outputsTarget: any, fields: string[]): FindCredsResult | undefined {
    for (const field of fields) {
      const value = outputsTarget[field];
      if (!value) {
        return this.cantFindSectionError(profileName, `outputs.${target}.${field}`);
      }
    }
  }

  cantFindSectionError(profileName: string, section: string): FindCredsResult {
    return this.errorResult(
      `Couldn't find section '${section}' for profile '${profileName}'. Check your '${this.profilesPath}' file. ${YamlParser.BQ_SERVICE_ACCOUNT_FILE_DOCS}`,
    );
  }

  findProfileCreds(): FindCredsResult {
    let profiles;
    try {
      profiles = this.parseYamlFile(this.profilesPath);
    } catch (e) {
      console.log(`Failed to open and parse file '${this.profilesPath}'. ${e}`);
      return this.errorResult(`Failed to open and parse file '${this.profilesPath}'. ${e}`);
    }

    let profileName;
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
    if (targetConfig.method === 'service-account') {
      return {
        creds: {
          project: targetConfig.project,
          keyFile: this.replaceTilde(targetConfig.keyfile),
        },
      };
    }
    return this.errorResult(
      `Currently only BigQuery service account credentials supported. Check your '${this.profilesPath}'. ${YamlParser.BQ_SERVICE_ACCOUNT_FILE_DOCS}`,
    );
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
