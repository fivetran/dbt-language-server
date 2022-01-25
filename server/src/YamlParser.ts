import * as fs from 'fs';
import * as yaml from 'yaml';
import { YamlParserUtils } from './YamlParserUtils';

export class YamlParser {
  static readonly DBT_PROJECT_FILE_NAME = 'dbt_project.yml';
  static readonly DBT_MANIFEST_FILE_NAME = 'manifest.json';
  static readonly DBT_PROJECT_NAME_FIELD = 'name';

  static readonly SOURCE_PATHS_FIELD = 'source-paths'; // v1.0.0: The config source-paths has been deprecated in favor of model-paths
  static readonly MODEL_PATHS_FIELD = 'model-paths';
  static readonly DEFAULT_MODEL_PATHS = ['models'];

  static readonly TARGET_PATH_FIELD = 'target-path';
  static readonly DEFAULT_TARGET_PATH = './target';

  profilesPath: string;

  constructor(profilesPath?: string) {
    const path = profilesPath ?? '~/.dbt/profiles.yml';
    this.profilesPath = YamlParserUtils.replaceTilde(path);
  }

  findProjectName(): string | undefined {
    try {
      const dbtProject = YamlParser.parseYamlFile(YamlParser.DBT_PROJECT_FILE_NAME);
      return dbtProject[YamlParser.DBT_PROJECT_NAME_FIELD] ?? undefined;
    } catch (e) {
      return undefined;
    }
  }

  findModelPaths(): string[] {
    try {
      const dbtProject = YamlParser.parseYamlFile(YamlParser.DBT_PROJECT_FILE_NAME);
      return dbtProject[YamlParser.MODEL_PATHS_FIELD] ?? dbtProject[YamlParser.SOURCE_PATHS_FIELD] ?? YamlParser.DEFAULT_MODEL_PATHS;
    } catch (e) {
      return YamlParser.DEFAULT_MODEL_PATHS;
    }
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

  static parseYamlFile(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(content, { uniqueKeys: false });
  }
}
