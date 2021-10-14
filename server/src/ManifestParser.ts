import { readFileSync } from 'fs';
import * as path from 'path';

export class ManifestParser {
  static readonly MANIFEST_FILE_NAME = 'manifest.json';
  static readonly RESOURCE_TYPE_MODEL = 'model';
  static readonly PROJECT_PATH = './';

  getModels(targetPath: string): string[] {
    const manifestLocation = path.join(ManifestParser.PROJECT_PATH, targetPath, ManifestParser.MANIFEST_FILE_NAME);
    try {
      const content = readFileSync(manifestLocation, 'utf8');
      const manifest = JSON.parse(content);
      const nodes = manifest.nodes;

      if (nodes) {
        return Object.values(<any[]>nodes)
          .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MODEL)
          .map(n => n.name);
      }
    } catch (e) {
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`, e);
    }
    return [];
  }
}
