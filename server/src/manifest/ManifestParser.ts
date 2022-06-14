import { readFileSync } from 'fs';
import * as path from 'path';
import { ManifestJson, ManifestMacro, ManifestModel, ManifestSource } from './ManifestJson';

interface RawNode {
  resource_type: string;
  unique_id: string;
  root_path: string;
  original_file_path: string;
  name: string;
  package_name: string;
  database: string;
  schema: string;
  source_name: string;
  columns: { name: string }[];
  depends_on: {
    nodes: string[];
  };
  refs: string[][];
}

interface RawManifest {
  nodes: RawNode[] | undefined;
  macros: RawNode[] | undefined;
  sources: RawNode[] | undefined;
}

export class ManifestParser {
  static readonly MANIFEST_FILE_NAME = 'manifest.json';
  static readonly RESOURCE_TYPE_MODEL = 'model';
  static readonly RESOURCE_TYPE_MACRO = 'macro';
  static readonly RESOURCE_TYPE_SOURCE = 'source';
  static readonly PROJECT_PATH = './';

  parse(targetPath: string): ManifestJson {
    const manifestLocation = path.join(ManifestParser.PROJECT_PATH, targetPath, ManifestParser.MANIFEST_FILE_NAME);
    const content = readFileSync(manifestLocation, 'utf8');
    const manifest = JSON.parse(content) as RawManifest;
    const { nodes, macros, sources } = manifest;

    return {
      models: this.parseModelDefinitions(nodes),
      macros: this.parseMacroDefinitions(macros),
      sources: this.parseSourceDefinitions(sources),
    };
  }

  private parseModelDefinitions(rawNodes: RawNode[] | undefined): ManifestModel[] {
    if (rawNodes) {
      return Object.values(rawNodes)
        .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MODEL)
        .map<ManifestModel>(n => ({
          uniqueId: n.unique_id,
          rootPath: n.root_path,
          originalFilePath: n.original_file_path,
          name: n.name,
          packageName: n.package_name,
          database: n.database,
          schema: n.schema,
          dependsOn: n.depends_on,
          refs: n.refs,
        }));
    }
    return [];
  }

  private parseMacroDefinitions(rawNodes: RawNode[] | undefined): ManifestMacro[] {
    if (rawNodes) {
      return Object.values(rawNodes)
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

  private parseSourceDefinitions(rawNodes: RawNode[] | undefined): ManifestSource[] {
    if (rawNodes) {
      return Object.values(rawNodes)
        .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_SOURCE)
        .map<ManifestSource>(n => ({
          uniqueId: n.unique_id,
          rootPath: n.root_path,
          originalFilePath: n.original_file_path,
          name: n.name,
          packageName: n.package_name,
          sourceName: n.source_name,
          columns: Object.values(n.columns).map(c => c.name),
        }));
    }
    return [];
  }
}
