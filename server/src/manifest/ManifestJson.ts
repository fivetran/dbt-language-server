import { Dag } from '../dag/Dag';

export interface ManifestNode {
  uniqueId: string;
  originalFilePath: string;
  name: string;
  packageName: string;
}

export interface ManifestModel extends ManifestNode {
  database: string;
  schema: string;
  rawCode: string;
  compiledCode: string;
  dependsOn: {
    nodes: string[];
  };
  refs: string[][];
  alias?: string;
  config?: {
    sqlHeader?: string;
    materialized?: string;
  };
}

export type ManifestMacro = ManifestNode;

export interface ManifestSource extends ManifestNode {
  sourceName: string;
  columns: string[];
}

export interface ManifestJson {
  macros: ManifestMacro[];
  sources: ManifestSource[];
  dag: Dag;
}
