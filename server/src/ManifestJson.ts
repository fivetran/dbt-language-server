export interface ManifestModel {
  name: string;
  database: string;
  schema: string;
  originalFilePath: string;
  dependsOn?: {
    macros?: string[];
  };
}

export interface ManifestMacro {
  uniqueId: string;
  originalFilePath: string;
}

export interface ManifestJson {
  models: ManifestModel[];
  macros: ManifestMacro[];
}

export function getFromClauseString(model: ManifestModel): string {
  return `\`${model.database}\`.\`${model.schema}\`.\`${model.name}\``;
}
