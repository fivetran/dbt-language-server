import * as fs from 'fs';
import { homedir } from 'os';
import * as yaml from 'yaml';

export class YamlParserUtils {
  static replaceTilde(path: string): string {
    return path.replace('~', homedir());
  }

  static parseYamlFile(filePath: string): any {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(content, { uniqueKeys: false });
  }
}
