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
    const content = readFileSync(manifestLocation, 'utf8');
    const manifest = JSON.parse(content);
    const { nodes, macros, sources } = manifest;

    return {
      models: this.parseModelDefinitions(nodes),
      macros: this.parseMacroDefinitions(macros),
      sources: this.parseSourceDefinitions(sources),
    };
  }

  private parseModelDefinitions(nodes: any): ManifestModel[] {
    if (nodes) {
      return Object.values(nodes as any[])
        .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MODEL)
        .map<ManifestModel>(n => ({
          uniqueId: n.unique_id,
          rootPath: n.root_path,
          originalFilePath: n.original_file_path,
          name: n.name,
          packageName: n.package_name,
          database: n.database,
          schema: n.schema,
        }));
    }
    return [];
  }

  private parseMacroDefinitions(macros: any): ManifestMacro[] {
    if (macros) {
      return Object.values(macros as any[])
        .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MACRO)
        .map<ManifestMacro>(n => ({
          uniqueId: n.unique_id,
          rootPath: n.root_path,
          originalFilePath: n.original_file_path,
          name: n.name,
          packageName: n.package_name,
        }));
    }
    return [];
  }

  private parseSourceDefinitions(sources: any): ManifestSource[] {
    if (sources) {
      return Object.values(sources as any[])
        .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_SOURCE)
        .map<ManifestSource>(n => ({
          uniqueId: n.unique_id,
          rootPath: n.root_path,
          originalFilePath: n.original_file_path,
          name: n.name,
          packageName: n.package_name,
          sourceName: n.source_name,
          columns: Object.values(n.columns as any[]).map(c => c.name as string),
        }));
    }
    return [];
  }
}
