import * as yaml from 'yaml';
import * as fs from 'fs';
import { homedir } from 'os';

export interface ServiceAccountCreds {
  project: string;
  keyFile: string;
}

export class YamlParser {
  static readonly DBT_PROJECT_FILE_NAME = 'dbt_project.yml';

  profilesPath: string;

  constructor(profilesPath?: string) {
    let path = profilesPath ?? '~/.dbt/profiles.yml';
    this.profilesPath = this.replaceTilde(path);
    console.log(JSON.stringify(this.findProfileCreds()));
  }

  findProfileName() {
    const dbtProject = this.parseYamlFile(YamlParser.DBT_PROJECT_FILE_NAME);
    console.log(`Profile name foud: ${dbtProject.profile}`);
    return dbtProject.profile;
  }

  findProfileCreds(): ServiceAccountCreds | undefined {
    const profile = this.parseYamlFile(this.profilesPath);
    const profileName = this.findProfileName();
    if (profile[profileName]) {
      const target = profile[profileName].target;
      const targetConfig = profile[profileName].outputs[target];
      if (targetConfig.method === 'service-account') {
        return {
          project: targetConfig.project,
          keyFile: this.replaceTilde(targetConfig.keyfile),
        };
      }
    }
  }

  parseYamlFile(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return yaml.parse(content);
    } catch (e) {
      console.log(`Failed to open and parse file ${filePath}`);
    }
  }

  replaceTilde(path: string) {
    return path.replace('~', homedir());
  }
}
