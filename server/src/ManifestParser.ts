import { readFileSync } from 'fs';
import * as path from 'path';
import { ManifestJson, ManifestNode } from './ManifestJson';

export class ManifestParser {
  static readonly MANIFEST_FILE_NAME = 'manifest.json';
  static readonly RESOURCE_TYPE_MODEL = 'model';
  static readonly PROJECT_PATH = './';

  parse(targetPath: string): ManifestJson {
    const manifestLocation = path.join(ManifestParser.PROJECT_PATH, targetPath, ManifestParser.MANIFEST_FILE_NAME);
    const content = readFileSync(manifestLocation, 'utf8');
    const manifest = JSON.parse(content);
    const { nodes } = manifest;

    return nodes
      ? {
          models: Object.values(nodes as any[])
            .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MODEL)
            .map<ManifestNode>(n => ({
              name: n.name,
              database: n.database,
              schema: n.schema,
            })),
        }
      : { models: [] };
  }
}
