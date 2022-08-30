import * as fs from 'node:fs';
import { homedir } from 'node:os';
import * as yaml from 'yaml';

export const YamlParserUtils = {
  replaceTilde(path: string): string {
    return path.replace('~', homedir());
  },

  parseYamlFile(filePath: string): unknown {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(content, { uniqueKeys: false });
  },
};
