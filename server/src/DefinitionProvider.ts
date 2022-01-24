import * as path from 'path';
import { DefinitionLink, integer, LocationLink, Position, Range } from 'vscode-languageserver';
import { ManifestMacro, ManifestModel } from './ManifestJson';

export class DefinitionProvider {
  dbtModels: ManifestModel[] = [];
  dbtMacros: ManifestMacro[] = [];
  workspaceFolder: string | undefined;

  setWorkspaceFolder(workspaceFolder: string): void {
    this.workspaceFolder = workspaceFolder;
  }

  setDbtModels(dbtModels: ManifestModel[]): void {
    this.dbtModels = dbtModels;
  }

  setDbtMacros(dbtMacros: ManifestMacro[]): void {
    this.dbtMacros = dbtMacros;
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
        Range.create(Position.create(0, 0), Position.create(integer.MAX_VALUE, integer.MAX_VALUE)),
        Range.create(Position.create(0, 0), Position.create(0, 0)),
        originSelectionRange,
      ),
    ];
  }

  onMacroDefinition(): DefinitionLink[] | undefined {
    // todo: implement
    return undefined;
  }
}
