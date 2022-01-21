import * as path from 'path';
import { DefinitionLink, LocationLink, Position, Range } from 'vscode-languageserver';
import { ManifestNode } from './ManifestJson';

export class DefinitionProvider {
  dbtModels: ManifestNode[] = [];
  workspaceFolder: string | undefined;

  setWorkspaceFolder(workspaceFolder: string): void {
    this.workspaceFolder = workspaceFolder;
  }

  setDbtModels(dbtModels: ManifestNode[]): void {
    this.dbtModels = dbtModels;
  }

  onRefDefinition(modelName: string, originSelectionRange: Range): DefinitionLink[] | undefined {
    if (this.workspaceFolder === undefined) {
      return undefined;
    }

    const modelDefinitions = this.dbtModels.filter(m => m.name === modelName);
    if (modelDefinitions.length === 0) {
      return undefined;
    }

    return [
      LocationLink.create(
        path.join(this.workspaceFolder, modelDefinitions[0].originalFilePath),
        Range.create(Position.create(0, 0), Position.create(0, 0)),
        Range.create(Position.create(0, 0), Position.create(0, 0)),
        originSelectionRange,
      ),
    ];
  }
}
