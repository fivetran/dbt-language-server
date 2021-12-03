import { homedir } from 'os';

export class YamlParserUtils {
  static replaceTilde(path: string): string {
    return path.replace('~', homedir());
  }
}
