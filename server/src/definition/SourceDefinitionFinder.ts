import * as fs from 'fs';
import * as path from 'path';
import { DefinitionLink, integer, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Expression } from '../JinjaParser';
import { ManifestSource } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsolutePosition, getAbsoluteRange, getRelativePosition, positionInRange } from '../utils/Utils';

export class SourceDefinitionFinder {
  static readonly SOURCE_PATTERN = /source\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('[^)']*'|"[^)"]*")\s*\)/;
  static readonly SOURCE_PARTS_PATTERN = /'[^']*'|"[^*]*"/g;

  searchSourceDefinitions(
    document: TextDocument,
    position: Position,
    expression: Expression,
    dbtSources: ManifestSource[],
  ): DefinitionLink[] | undefined {
    const expressionLines = expression.expression.split('\n');
    const relativePosition = getRelativePosition(expression.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, SourceDefinitionFinder.SOURCE_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(expression.range.start, wordRange));
      const matches = [];
      let match: RegExpExecArray | null;
      while ((match = SourceDefinitionFinder.SOURCE_PARTS_PATTERN.exec(word))) {
        matches.push({
          text: match[0],
          index: match.index,
        });
      }

      if (matches.length !== 2) {
        return undefined;
      }

      const [source, table] = matches;
      const sourceSelectionRange = Range.create(
        document.positionAt(document.offsetAt(getAbsolutePosition(expression.range.start, wordRange.start)) + source.index + 1),
        document.positionAt(document.offsetAt(getAbsolutePosition(expression.range.start, wordRange.start)) + source.index + source.text.length - 1),
      );
      const tableSelectionRange = Range.create(
        document.positionAt(document.offsetAt(getAbsolutePosition(expression.range.start, wordRange.start)) + table.index + 1),
        document.positionAt(document.offsetAt(getAbsolutePosition(expression.range.start, wordRange.start)) + table.index + table.text.length - 1),
      );

      if (positionInRange(position, sourceSelectionRange)) {
        return this.getSourceDefinitions(source.text.substring(1).slice(0, -1), dbtSources, sourceSelectionRange);
      } else if (positionInRange(position, tableSelectionRange)) {
        return this.getTableDefinitions(source.text.substring(1).slice(0, -1), table.text.substring(1).slice(0, -1), dbtSources, tableSelectionRange);
      }
    }

    return undefined;
  }

  getSourceDefinitions(source: string, dbtSources: ManifestSource[], sourceSelectionRange: Range): DefinitionLink[] | undefined {
    const sources = dbtSources.filter(s => s.sourceName === source);
    if (sources.length === 0) {
      return undefined;
    }

    const sourceDefinitionFilePath = path.join(sources[0].rootPath, sources[0].originalFilePath);
    const sourceDefinitionFileContent = fs.readFileSync(sourceDefinitionFilePath, 'utf8');

    return sources.map(s => {
      const [definitionRange, selectionRange] = this.getSourceRanges(s.sourceName, s.name, s, sourceDefinitionFileContent);
      return LocationLink.create(sourceDefinitionFilePath, definitionRange, selectionRange, sourceSelectionRange);
    });
  }

  getTableDefinitions(source: string, table: string, dbtSources: ManifestSource[], tableSelectionRange: Range): DefinitionLink[] | undefined {
    const sourcesSearch = dbtSources.filter(s => s.sourceName === source && s.name === table);
    if (sourcesSearch.length === 0) {
      return undefined;
    }

    const [selectedSource] = sourcesSearch;
    const sourceDefinitionFilePath = path.join(selectedSource.rootPath, selectedSource.originalFilePath);
    const sourceDefinitionFileContent = fs.readFileSync(sourceDefinitionFilePath, 'utf8');
    const [definitionRange, selectionRange] = this.getSourceRanges(
      selectedSource.sourceName,
      selectedSource.name,
      selectedSource,
      sourceDefinitionFileContent,
    );

    return [
      LocationLink.create(path.join(selectedSource.rootPath, selectedSource.originalFilePath), definitionRange, selectionRange, tableSelectionRange),
    ];
  }

  // todo: rewrite candidate
  // todo: span definition on all table
  getSourceRanges(sourceName: string, tableName: string, dbtSource: ManifestSource, definitionFileContent: string): [Range, Range] {
    const definitionFileContentLines = definitionFileContent.split('\n');
    let levelIndentation: number | undefined = undefined;
    let level: 'up' | 'sources' | 'tables' = 'up';
    let sourceMatch = false;

    for (let i = 0; i < definitionFileContentLines.length; i++) {
      const line = definitionFileContentLines[i];
      const lineContentMatch = /\S+/.exec(line);
      if (lineContentMatch) {
        const lineIndentation = lineContentMatch.index;
        levelIndentation = levelIndentation ?? lineIndentation;

        if (line.includes('sources:')) {
          level = 'sources';
          levelIndentation = undefined;
        } else if (line.includes('tables:')) {
          level = 'tables';
          levelIndentation = undefined;
        } else if (line.includes('name:')) {
          if (level === 'sources') {
            sourceMatch = line.includes(sourceName);
          } else if (level === 'tables' && line.includes(tableName) && sourceMatch) {
            return [
              Range.create(Position.create(i, levelIndentation), Position.create(i, line.length)),
              Range.create(Position.create(i, line.indexOf(tableName)), Position.create(i, line.indexOf(tableName) + tableName.length)),
            ];
          }
        }
      }
    }

    return [
      Range.create(Position.create(0, 0), Position.create(integer.MAX_VALUE, integer.MAX_VALUE)),
      Range.create(Position.create(0, 0), Position.create(0, 0)),
    ];
  }
}
