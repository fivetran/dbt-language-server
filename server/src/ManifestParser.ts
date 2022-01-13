import { readFileSync } from 'fs';
import * as path from 'path';
import { ManifestJson, ManifestNode } from './ManifestJson';

export class ManifestParser {
  static readonly MANIFEST_FILE_NAME = 'manifest.json';
  static readonly RESOURCE_TYPE_MODEL = 'model';
  static readonly PROJECT_PATH = './';

  parse(targetPath: string): ManifestJson {
    const manifestLocation = path.join(ManifestParser.PROJECT_PATH, targetPath, ManifestParser.MANIFEST_FILE_NAME);
    try {
      const content = readFileSync(manifestLocation, 'utf8');
      const manifest = JSON.parse(content);
      const { nodes } = manifest;

      if (nodes) {
        return <ManifestJson>{
          models: Object.values(<any[]>nodes)
            .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MODEL)
            .map(
              n =>
                <ManifestNode>{
                  name: n.name,
                  database: n.database,
                  schema: n.schema,
                },
            ),
        };
      }
    } catch (e) {
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`, e);
    }
    return <ManifestJson>{};
  }
}
