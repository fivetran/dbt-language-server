export interface ManifestNode {
  name: string;
  database: string;
  schema: string;
}

export interface ManifestJson {
  models: ManifestNode[];
}

export function getFromClauseString(model: ManifestNode): string {
  return `\`${model.database}\`.\`${model.schema}\`.\`${model.name}\``;
}
