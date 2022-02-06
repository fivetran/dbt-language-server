import { readFileSync } from 'fs';
import * as path from 'path';
import { ManifestJson, ManifestMacro, ManifestModel, ManifestSource } from './ManifestJson';

export class ManifestParser {
  static readonly MANIFEST_FILE_NAME = 'manifest.json';
  static readonly RESOURCE_TYPE_MODEL = 'model';
  static readonly RESOURCE_TYPE_MACRO = 'macro';
  static readonly RESOURCE_TYPE_SOURCE = 'source';
  static readonly PROJECT_PATH = './';

  parse(targetPath: string): ManifestJson {
    const manifestLocation = path.join(ManifestParser.PROJECT_PATH, targetPath, ManifestParser.MANIFEST_FILE_NAME);
    try {
      const content = readFileSync(manifestLocation, 'utf8');
      const manifest = JSON.parse(content);
      const { nodes, macros, sources } = manifest;

      let modelsDefinitions: ManifestModel[] = [];
      let macrosDefinitions: ManifestMacro[] = [];
      let sourcesDefinitions: ManifestSource[] = [];

      if (nodes) {
        modelsDefinitions = Object.values(nodes as any[])
          .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MODEL)
          .map<ManifestModel>(n => ({
            uniqueId: n.unique_id,
            rootPath: n.root_path,
            originalFilePath: n.original_file_path,
            name: n.name,
            database: n.database,
            schema: n.schema,
          }));
      }

      if (macros) {
        macrosDefinitions = Object.values(macros as any[])
          .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MACRO)
          .map<ManifestMacro>(n => ({
            uniqueId: n.unique_id,
            rootPath: n.root_path,
            originalFilePath: n.original_file_path,
            name: n.name,
            packageName: n.package_name,
          }));
      }

      if (sources) {
        sourcesDefinitions = Object.values(sources as any[])
          .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_SOURCE)
          .map<ManifestSource>(n => ({
            uniqueId: n.unique_id,
            rootPath: n.root_path,
            originalFilePath: n.original_file_path,
            name: n.name,
            sourceName: n.source_name,
            columns: Object.values(n.columns as any[]).map(c => c.name),
          }));
      }

      return {
        models: modelsDefinitions,
        macros: macrosDefinitions,
        sources: sourcesDefinitions,
      };
    } catch (e) {
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`, e);
    }
    return { models: [], macros: [], sources: [] };
  }
}
