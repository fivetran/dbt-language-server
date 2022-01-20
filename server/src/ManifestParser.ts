import { readFileSync } from 'fs';
import * as path from 'path';
import { ManifestJson, ManifestNode } from './ManifestJson';

export class ManifestParser {
  static readonly MANIFEST_FILE_NAME = 'manifest.json';
  static readonly RESOURCE_TYPE_MODEL = 'model';
  static readonly PROJECT_PATH = './';

  workspaceFolder = '';

  setWorkspaceFolder(workspaceFolder: string): void {
    this.workspaceFolder = workspaceFolder;
  }

  parse(targetPath: string): ManifestJson {
    const manifestLocation = path.join(ManifestParser.PROJECT_PATH, targetPath, ManifestParser.MANIFEST_FILE_NAME);
    try {
      const content = readFileSync(manifestLocation, 'utf8');
      const manifest = JSON.parse(content);
      const { nodes } = manifest;

      if (nodes && this.workspaceFolder) {
        return {
          models: Object.values(nodes as any[])
            .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MODEL)
            .map<ManifestNode>(n => ({
              name: n.name,
              database: n.database,
              schema: n.schema,
              package: `${this.workspaceFolder}/models/${n.name}.sql`,
            })),
        };
      }
    } catch (e) {
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`, e);
    }
    return { models: [] };
  }
}
