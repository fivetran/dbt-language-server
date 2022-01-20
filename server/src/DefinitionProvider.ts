import { DefinitionLink, LocationLink, Position, Range } from 'vscode-languageserver';
import { ManifestNode } from './ManifestJson';

export class DefinitionProvider {
  dbtModels: ManifestNode[] = [];

  setDbtModels(dbtModels: ManifestNode[]): void {
    this.dbtModels = dbtModels;
  }

  onRefDefinition(modelName: string): DefinitionLink[] | undefined {
    if (this.dbtModels.some(m => m.name === modelName)) {
      return [
        LocationLink.create(
          this.dbtModels.filter(m => m.name === modelName)[0].package,
          Range.create(Position.create(0, 0), Position.create(0, 0)),
          Range.create(Position.create(0, 0), Position.create(0, 0)),
        ),
      ];
    }
    return undefined;
  }
}
