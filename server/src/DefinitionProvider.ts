import * as path from 'path';
import { DefinitionLink, Event, integer, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Expression } from './JinjaParser';
import { ManifestMacro, ManifestModel, ManifestSource } from './manifest/ManifestJson';
import { getWordRangeAtPosition } from './utils/TextUtils';
import { getAbsoluteRange, getRelativePosition } from './utils/Utils';

export class DefinitionProvider {
  static readonly MODEL_PATTERN = /todo/;
  static readonly MACRO_PATTERN = /todo/;
  static readonly SOURCE_PATTERN = /(source)\([^)]*\)/;
  static readonly SOURCE_PARTS_PATTERN = /(?!['"])(\w+)(?=['"])/g;

  static readonly DBT_PACKAGE = 'dbt';

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
    const expressionLines = expression.expression.split('\n');

    const refDefinitions = this.searchRefDefinitions(document, position, expressionLines);
    if (refDefinitions) {
      return refDefinitions;
    }

    const macroDefinitions = this.searchMacroDefinitions();
    if (macroDefinitions) {
      return macroDefinitions;
    }

    const sourceDefinitions = this.searchSourceDefinitions(document, position, expression, expressionLines);
    if (sourceDefinitions) {
      return sourceDefinitions;
    }

    return undefined;
  }

  private searchRefDefinitions(document: TextDocument, position: Position, lines: string[]): DefinitionLink[] | undefined {
    if (!lines[0].startsWith('{{')) {
      return undefined;
    }
    return undefined;
  }

  private searchMacroDefinitions(): DefinitionLink[] | undefined {
    return undefined;
  }

  private searchSourceDefinitions(
    document: TextDocument,
    position: Position,
    expression: Expression,
    expressionLines: string[],
  ): DefinitionLink[] | undefined {
    if (!expressionLines[0].startsWith('{{')) {
      return undefined;
    }

    const relativePosition = getRelativePosition(expression.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, DefinitionProvider.SOURCE_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(expression.range.start, wordRange));
      const sourceMatch = word.match(DefinitionProvider.SOURCE_PARTS_PATTERN);
      if (sourceMatch === null) {
        return undefined;
      }
      if (sourceMatch.length < 2) {
        return undefined;
      }

      const [sourceName, tableName] = sourceMatch;
      const sourcesSearch = this.dbtSources.filter(s => s.sourceName === sourceName && s.name === tableName);
      if (sourcesSearch.length === 0) {
        return undefined;
      }

      const [selectedSource] = sourcesSearch;
      return [
        LocationLink.create(
          path.join(selectedSource.rootPath, selectedSource.originalFilePath),
          Range.create(Position.create(0, 0), Position.create(integer.MAX_VALUE, integer.MAX_VALUE)),
          Range.create(Position.create(0, 0), Position.create(0, 0)),
          getAbsoluteRange(expression.range.start, wordRange),
        ),
      ];
    }

    return undefined;
  }
}
