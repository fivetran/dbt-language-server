import * as path from 'path';
import { DefinitionLink, integer, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Expression } from './JinjaParser';
import { ManifestMacro, ManifestModel } from './ManifestJson';
import { positionInRange } from './Utils';

export class DefinitionProvider {
  static readonly DBT_PACKAGE = 'dbt';

  workspaceFolder: string | undefined;
  projectName: string | undefined;
  dbtModels: ManifestModel[] = [];
  dbtMacros: ManifestMacro[] = [];

  setWorkspaceFolder(workspaceFolder: string): void {
    this.workspaceFolder = workspaceFolder;
  }

  setProjectName(projectName: string | undefined): void {
    this.projectName = projectName;
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

  onExpressionDefinition(
    document: TextDocument,
    documentModelName: string,
    expression: Expression,
    position: Position,
  ): DefinitionLink[] | undefined {
    if (this.workspaceFolder === undefined) {
      return undefined;
    }

    const manifestModels = this.dbtModels.filter(m => m.name === documentModelName);
    if (manifestModels.length !== 1) {
      return undefined;
    }

    const macrosDependencies = manifestModels[0].dependsOn?.macros;
    if (!macrosDependencies) {
      return undefined;
    }

    for (const macroDependency of macrosDependencies) {
      const macroParts = macroDependency.split('.');
      const macrosSearch =
        macroParts[1] === this.projectName || macroParts[1] === DefinitionProvider.DBT_PACKAGE ? macroParts[2] : `${macroParts[1]}.${macroParts[2]}`;
      const search = expression.expression.indexOf(macrosSearch);

      if (search === -1) {
        continue;
      }

      const macroRange = Range.create(
        document.positionAt(document.offsetAt(expression.range.start) + search),
        document.positionAt(document.offsetAt(expression.range.start) + search + macrosSearch.length),
      );

      if (positionInRange(position, macroRange)) {
        const macro = this.dbtMacros.filter(m => m.uniqueId === macroDependency);
        return macro.length === 1
          ? [
              LocationLink.create(
                path.join(this.workspaceFolder, macro[0].originalFilePath),
                Range.create(Position.create(0, 0), Position.create(integer.MAX_VALUE, integer.MAX_VALUE)),
                Range.create(Position.create(0, 0), Position.create(0, 0)),
                macroRange,
              ),
            ]
          : undefined;
      }
    }

    return undefined;
  }
}
