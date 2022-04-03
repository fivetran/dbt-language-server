import * as fs from 'fs';
import * as yaml from 'yaml';
import { DbtRepository } from './DbtRepository';
import { YamlParserUtils } from './YamlParserUtils';

export class YamlParser {
  profilesPath: string;

  constructor(profilesPath?: string) {
    const path = profilesPath ?? '~/.dbt/profiles.yml';
    this.profilesPath = YamlParserUtils.replaceTilde(path);
  }

  findProjectName(): string | undefined {
    try {
      const dbtProject = YamlParser.parseYamlFile(DbtRepository.DBT_PROJECT_FILE_NAME);
      return dbtProject[DbtRepository.DBT_PROJECT_NAME_FIELD] ? (dbtProject[DbtRepository.DBT_PROJECT_NAME_FIELD] as string) : undefined;
    } catch (e) {
      return undefined;
    }
  }

  findModelPaths(): string[] {
    try {
      const dbtProject = YamlParser.parseYamlFile(DbtRepository.DBT_PROJECT_FILE_NAME);
      return (dbtProject[DbtRepository.MODEL_PATHS_FIELD] ??
        dbtProject[DbtRepository.SOURCE_PATHS_FIELD] ??
        DbtRepository.DEFAULT_MODEL_PATHS) as string[];
    } catch (e) {
      return DbtRepository.DEFAULT_MODEL_PATHS;
    }
  }

  findPackagesInstallPaths(): string[] {
    try {
      const dbtProject = YamlParser.parseYamlFile(DbtRepository.DBT_PROJECT_FILE_NAME);
      return (dbtProject[DbtRepository.PACKAGES_INSTALL_PATH_FIELD] ??
        dbtProject[DbtRepository.MODULE_PATH] ??
        DbtRepository.DEFAULT_PACKAGES_PATHS) as string[];
    } catch (e) {
      return DbtRepository.DEFAULT_PACKAGES_PATHS;
    }
  }

  findTargetPath(): string {
    try {
      const dbtProject = YamlParser.parseYamlFile(DbtRepository.DBT_PROJECT_FILE_NAME);
      return (dbtProject[DbtRepository.TARGET_PATH_FIELD] ?? DbtRepository.DEFAULT_TARGET_PATH) as string;
    } catch (e) {
      return DbtRepository.DEFAULT_TARGET_PATH;
    }
  }

  /** In dbt package's dbt_project.yml profile may be missing */
  findProfileName(): string {
    const dbtProject = YamlParser.parseYamlFile(DbtRepository.DBT_PROJECT_FILE_NAME);
    if (dbtProject?.profile === undefined) {
      throw new Error("'profile' field is missing");
    }
    console.log(`Profile name found: ${dbtProject?.profile}`);
    return dbtProject?.profile as string;
  }

  static parseYamlFile(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(content, { uniqueKeys: false });
  }
}
