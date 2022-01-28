import * as path from 'path';
import { DefinitionLink, integer, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Expression } from '../JinjaParser';
import { ManifestSource } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsoluteRange, getRelativePosition } from '../utils/Utils';

export class SourceDefinitionFinder {
  static readonly SOURCE_PATTERN = /(source)\([^)]*\)/;
  static readonly SOURCE_PARTS_PATTERN = /(?!['"])(\w+)(?=['"])/g;

  searchSourceDefinitions(
    document: TextDocument,
    position: Position,
    expression: Expression,
    dbtSources: ManifestSource[],
  ): DefinitionLink[] | undefined {
    const expressionLines = expression.expression.split('\n');
    if (!expressionLines[0].startsWith('{{')) {
      return undefined;
    }

    const relativePosition = getRelativePosition(expression.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, SourceDefinitionFinder.SOURCE_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(expression.range.start, wordRange));
      const sourceMatch = word.match(SourceDefinitionFinder.SOURCE_PARTS_PATTERN);
      if (sourceMatch === null) {
        return undefined;
      }
      if (sourceMatch.length < 2) {
        return undefined;
      }

      const [sourceName, tableName] = sourceMatch;
      const sourcesSearch = dbtSources.filter(s => s.sourceName === sourceName && s.name === tableName);
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
