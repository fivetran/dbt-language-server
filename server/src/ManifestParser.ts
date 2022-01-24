import { readFileSync } from 'fs';
import * as path from 'path';
import { ManifestJson, ManifestMacro, ManifestModel } from './ManifestJson';

export class ManifestParser {
  static readonly MANIFEST_FILE_NAME = 'manifest.json';
  static readonly RESOURCE_TYPE_MODEL = 'model';
  static readonly RESOURCE_TYPE_MACRO = 'macro';
  static readonly PROJECT_PATH = './';

  parse(targetPath: string): ManifestJson {
    const manifestLocation = path.join(ManifestParser.PROJECT_PATH, targetPath, ManifestParser.MANIFEST_FILE_NAME);
    try {
      const content = readFileSync(manifestLocation, 'utf8');
      const manifest = JSON.parse(content);
      const { nodes } = manifest;

      if (nodes) {
        return {
          models: Object.values(nodes as any[])
            .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MODEL)
            .map<ManifestModel>(n => ({
              name: n.name,
              database: n.database,
              schema: n.schema,
              originalFilePath: n.original_file_path,
              dependsOn: n.depends_on,
            })),
          macros: Object.values(nodes as any[])
            .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MACRO)
            .map<ManifestMacro>(n => ({
              uniqueId: n.unique_id,
              originalFilePath: n.original_file_path,
            })),
        };
      }
    } catch (e) {
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`, e);
    }
    return { models: [], macros: [] };
  }
}
