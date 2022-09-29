interface ManifestNode {
  uniqueId: string;
  rootPath: string;
  originalFilePath: string;
  name: string;
  packageName: string;
}

export interface ManifestModel extends ManifestNode {
  database: string;
  schema: string;
  dependsOn: {
    nodes: string[];
  };
  refs: string[][];
  alias?: string;
  config?: {
    sqlHeader?: string;
  };
}

export type ManifestMacro = ManifestNode;

export interface ManifestSource extends ManifestNode {
  sourceName: string;
  columns: string[];
}

export interface ManifestJson {
  models: ManifestModel[];
  macros: ManifestMacro[];
  sources: ManifestSource[];
}
