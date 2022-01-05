import * as fs from 'fs';
import * as yaml from 'yaml';
import { YamlParserUtils } from './YamlParserUtils';

export class YamlParser {
  static readonly DBT_PROJECT_FILE_NAME = 'dbt_project.yml';
  static readonly DBT_MANIFEST_FILE_NAME = 'manifest.json';
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

  static parseYamlFile(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(content, { uniqueKeys: false });
  }
}
