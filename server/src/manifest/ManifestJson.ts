export interface ManifestModel {
  uniqueId: string;
  rootPath: string;
  originalFilePath: string;
  name: string;
  database: string;
  schema: string;
  dependsOn?: {
    macros?: string[];
  };
}

export interface ManifestMacro {
  uniqueId: string;
  rootPath: string;
  originalFilePath: string;
  name: string;
  packageName: string;
}

export interface ManifestSource {
  uniqueId: string;
  rootPath: string;
  originalFilePath: string;
  name: string;
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
