import * as path from 'path';
import { DefinitionLink, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ParseNode } from '../JinjaParser';
import { ManifestSource } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsolutePosition, getAbsoluteRange, getRelativePosition, positionInRange } from '../utils/Utils';
import { JinjaDefinitionProvider } from './JinjaDefinitionProvider';

export class SourceDefinitionFinder {
  static readonly SOURCE_PATTERN = /source\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('[^)']*'|"[^)"]*")\s*\)/;
  static readonly SOURCE_PARTS_PATTERN = /'[^']*'|"[^*]*"/g;

  searchSourceDefinitions(document: TextDocument, position: Position, jinja: ParseNode, dbtSources: ManifestSource[]): DefinitionLink[] | undefined {
    const expressionLines = jinja.value.split('\n');
    const relativePosition = getRelativePosition(jinja.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, SourceDefinitionFinder.SOURCE_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(jinja.range.start, wordRange));
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
        document.positionAt(document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start)) + source.index + 1),
        document.positionAt(document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start)) + source.index + source.text.length - 1),
      );
      const tableSelectionRange = Range.create(
        document.positionAt(document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start)) + table.index + 1),
        document.positionAt(document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start)) + table.index + table.text.length - 1),
      );

      if (positionInRange(position, sourceSelectionRange)) {
        return this.getTableDefinitions(
          source.text.substring(1).slice(0, -1),
          table.text.substring(1).slice(0, -1),
          dbtSources,
          sourceSelectionRange,
        );
      } else if (positionInRange(position, tableSelectionRange)) {
        return this.getTableDefinitions(source.text.substring(1).slice(0, -1), table.text.substring(1).slice(0, -1), dbtSources, tableSelectionRange);
      }
    }

    return undefined;
  }

  getTableDefinitions(source: string, table: string, dbtSources: ManifestSource[], tableSelectionRange: Range): DefinitionLink[] | undefined {
    const foundSource = dbtSources.find(s => s.sourceName === source && s.name === table);
    if (foundSource) {
      return [
        LocationLink.create(
          path.join(foundSource.rootPath, foundSource.originalFilePath),
          JinjaDefinitionProvider.MAX_RANGE,
          JinjaDefinitionProvider.MAX_RANGE,
          tableSelectionRange,
        ),
      ];
    }
    return undefined;
  }
}
