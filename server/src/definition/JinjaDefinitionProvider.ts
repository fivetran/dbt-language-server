import { DefinitionLink, Event, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Expression } from '../JinjaParser';
import { ManifestMacro, ManifestModel, ManifestSource } from '../manifest/ManifestJson';
import { MacroDefinitionFinder } from './MacroDefinitionFinder';
import { RefDefinitionFinder } from './RefDefinitionFinder';
import { SourceDefinitionFinder } from './SourceDefinitionFinder';

export class JinjaDefinitionProvider {
  refDefinitionFinder = new RefDefinitionFinder();
  macroDefinitionFinder = new MacroDefinitionFinder();
  sourceDefinitionFinder = new SourceDefinitionFinder();

  projectName: string | undefined;
  dbtModels: ManifestModel[] = [];
  dbtMacros: ManifestMacro[] = [];
  dbtSources: ManifestSource[] = [];

  constructor(
    onProjectNameChanged: Event<string | undefined>,
    onModelsChanged: Event<ManifestModel[]>,
    onMacrosChanged: Event<ManifestMacro[]>,
    onSourcesChanged: Event<ManifestSource[]>,
  ) {
    onProjectNameChanged(this.onProjectNameChanged.bind(this));
    onModelsChanged(this.onModelsChanged.bind(this));
    onMacrosChanged(this.onMacrosChanged.bind(this));
    onSourcesChanged(this.onSourcesChanged.bind(this));
  }

  onProjectNameChanged(projectName: string | undefined): void {
    this.projectName = projectName;
  }

  onModelsChanged(dbtModels: ManifestModel[]): void {
    this.dbtModels = dbtModels;
  }

  onMacrosChanged(dbtMacros: ManifestMacro[]): void {
    this.dbtMacros = dbtMacros;
  }

  onSourcesChanged(dbtSources: ManifestSource[]): void {
    this.dbtSources = dbtSources;
  }

  onExpressionDefinition(document: TextDocument, expression: Expression, position: Position): DefinitionLink[] | undefined {
    if (this.projectName && this.isExpression(expression.expression)) {
      const refDefinitions = this.refDefinitionFinder.searchRefDefinitions(document, position, expression, this.projectName, this.dbtModels);
      if (refDefinitions) {
        return refDefinitions;
      }
    }

    if (this.projectName) {
      const macroDefinitions = this.macroDefinitionFinder.searchMacroDefinitions(document, position, expression, this.projectName, this.dbtMacros);
      if (macroDefinitions) {
        return macroDefinitions;
      }
    }

    if (this.isExpression(expression.expression)) {
      const sourceDefinitions = this.sourceDefinitionFinder.searchSourceDefinitions(document, position, expression, this.dbtSources);
      if (sourceDefinitions) {
        return sourceDefinitions;
      }
    }

    return undefined;
  }

  isExpression(expression: string): boolean {
    return expression.match(/^{\s*{/) !== null;
  }

  isStatement(expression: string): boolean {
    return expression.match(/^{%/) !== null;
  }
}
