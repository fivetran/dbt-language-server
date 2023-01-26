import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { DagGenerator } from '../dag/DagGenerator';
import { ManifestJson, ManifestMacro, ManifestModel, ManifestSource } from './ManifestJson';

interface RawNode {
  resource_type: string;
  unique_id: string;
  original_file_path: string;
  name: string;
  package_name: string;
  database: string;
  schema: string;
  raw_sql: string;
  raw_code?: string;
  compiled_sql: string;
  compiled_code?: string;
  source_name: string;
  columns: { name: string }[];
  depends_on: {
    nodes: string[];
  };
  refs: string[][];
  alias?: string;
  config?: {
    sql_header?: string;
    materialized?: string;
  };
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

  static readonly DAG_GENERATOR = new DagGenerator();

  /** we don't continue parse manifest if there is no compiled code */
  parse(targetPath: string): ManifestJson | undefined {
    const manifestPath = ManifestParser.getManifestPath(targetPath);
    const content = readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content) as RawManifest;
    const { nodes, macros, sources } = manifest;

    const models = this.parseModelDefinitions(nodes);
    return models.some(m => m.compiledCode)
      ? {
          macros: this.parseMacroDefinitions(macros),
          sources: this.parseSourceDefinitions(sources),
          dag: ManifestParser.DAG_GENERATOR.generateDbtGraph(models),
        }
      : undefined;
  }

  static getManifestPath(targetPath: string): string {
    return path.join(path.isAbsolute(targetPath) ? '' : ManifestParser.PROJECT_PATH, targetPath, ManifestParser.MANIFEST_FILE_NAME);
  }

  private parseModelDefinitions(rawNodes: RawNode[] | undefined): ManifestModel[] {
    if (rawNodes) {
      return Object.values(rawNodes)
        .filter(n => n.resource_type === ManifestParser.RESOURCE_TYPE_MODEL)
        .map<ManifestModel>(n => ({
          uniqueId: n.unique_id,
          originalFilePath: n.original_file_path,
          name: n.name,
          packageName: n.package_name,
          database: n.database,
          schema: n.schema,
          rawCode: n.raw_code ?? n.raw_sql,
          compiledCode: n.compiled_code ?? n.compiled_sql,
          dependsOn: n.depends_on,
          refs: n.refs,
          alias: n.alias,
          config: {
            sqlHeader: n.config?.sql_header,
            materialized: n.config?.materialized,
          },
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
