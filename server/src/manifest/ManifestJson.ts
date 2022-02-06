interface ManifestNode {
  uniqueId: string;
  rootPath: string;
  originalFilePath: string;
  name: string;
}

export interface ManifestModel extends ManifestNode {
  database: string;
  schema: string;
  dependsOn?: {
    macros?: string[];
  };
}

export interface ManifestMacro extends ManifestNode {
  packageName: string;
}

export interface ManifestSource extends ManifestNode {
  sourceName: string;
  columns: string[];
}

export interface ManifestJson {
  models: ManifestModel[];
  macros: ManifestMacro[];
  sources: ManifestSource[];
}

export function getFromClauseString(model: ManifestModel): string {
  return `\`${model.database}\`.\`${model.schema}\`.\`${model.name}\``;
}
