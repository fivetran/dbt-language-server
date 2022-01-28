import { DefinitionLink, Event, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Expression } from '../JinjaParser';
import { ManifestMacro, ManifestModel, ManifestSource } from '../manifest/ManifestJson';
import { MacroDefinitionFinder } from './MacroDefinitionFinder';
import { ModelDefinitionFinder } from './ModelDefinitionFinder';
import { SourceDefinitionFinder } from './SourceDefinitionFinder';

export class JinjaDefinitionProvider {
  static readonly MODEL_PATTERN = /todo/;

  modelDefinitionFinder = new ModelDefinitionFinder();
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
    const refDefinitions = this.modelDefinitionFinder.searchModelDefinitions(document, position, expression, this.dbtModels);
    if (refDefinitions) {
      return refDefinitions;
    }

    if (this.projectName) {
      const macroDefinitions = this.macroDefinitionFinder.searchMacroDefinitions(document, position, expression, this.projectName, this.dbtMacros);
      if (macroDefinitions) {
        return macroDefinitions;
      }
    }

    const sourceDefinitions = this.sourceDefinitionFinder.searchSourceDefinitions(document, position, expression, this.dbtSources);
    if (sourceDefinitions) {
      return sourceDefinitions;
    }

    return undefined;
  }
}
