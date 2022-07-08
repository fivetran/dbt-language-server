import * as fs from 'fs';
import * as path from 'path';
import { DefinitionLink, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtRepository } from '../DbtRepository';
import { ParseNode } from '../JinjaParser';
import { ManifestSource } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsolutePosition, getAbsoluteRange, getRelativePosition, positionInRange, truncateAtBothSides } from '../utils/Utils';
import { DbtDefinitionProvider, DbtNodeDefinitionProvider } from './DbtDefinitionProvider';

export class SourceDefinitionProvider implements DbtNodeDefinitionProvider {
  static readonly SOURCE_PATTERN = /source\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('[^)']*'|"[^)"]*")\s*\)/;
  static readonly SOURCE_PARTS_PATTERN = /'[^']*'|"[^*]*"/g;

  constructor(private dbtRepository: DbtRepository) {}

  provideDefinitions(document: TextDocument, position: Position, jinja: ParseNode): DefinitionLink[] | undefined {
    const expressionLines = jinja.value.split('\n');
    const relativePosition = getRelativePosition(jinja.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, SourceDefinitionProvider.SOURCE_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(jinja.range.start, wordRange));
      const matches = [];
      let match: RegExpExecArray | null;
      while ((match = SourceDefinitionProvider.SOURCE_PARTS_PATTERN.exec(word))) {
        matches.push({
          text: match[0],
          index: match.index,
        });
      }

      if (matches.length !== 2) {
        return undefined;
      }

      const [source, table] = matches;
      const wordAbsoluteOffset = document.offsetAt(getAbsolutePosition(jinja.range.start, wordRange.start));

      const sourceSelectionRange = Range.create(
        document.positionAt(wordAbsoluteOffset + source.index + 1),
        document.positionAt(wordAbsoluteOffset + source.index + source.text.length - 1),
      );
      const tableSelectionRange = Range.create(
        document.positionAt(wordAbsoluteOffset + table.index + 1),
        document.positionAt(wordAbsoluteOffset + table.index + table.text.length - 1),
      );

      if (positionInRange(position, sourceSelectionRange)) {
        return this.getTableDefinitions(
          truncateAtBothSides(source.text),
          truncateAtBothSides(table.text),
          this.dbtRepository.sources,
          sourceSelectionRange,
        );
      } else if (positionInRange(position, tableSelectionRange)) {
        return this.getTableDefinitions(
          truncateAtBothSides(source.text),
          truncateAtBothSides(table.text),
          this.dbtRepository.sources,
          tableSelectionRange,
        );
      }
    }

    return undefined;
  }

  getTableDefinitions(source: string, table: string, dbtSources: ManifestSource[], tableSelectionRange: Range): DefinitionLink[] | undefined {
    const foundSource = dbtSources.find(s => s.sourceName === source && s.name === table);
    if (foundSource) {
      const sourceDefinitionFileContent = fs.readFileSync(foundSource.originalFilePath, 'utf8');
      const sourceDefinitionFileLines = sourceDefinitionFileContent.split('\n');
      const targetRange = this.getSourceRange(sourceDefinitionFileLines, table);
      return [
        LocationLink.create(
          path.join(foundSource.rootPath, foundSource.originalFilePath),
          targetRange ?? DbtDefinitionProvider.MAX_RANGE,
          targetRange ?? DbtDefinitionProvider.MAX_RANGE,
          tableSelectionRange,
        ),
      ];
    }
    return undefined;
  }

  getSourceRange(lines: string[], tableName: string): Range | undefined {
    const tablePattern = new RegExp(`-\\s*name:\\s*${tableName}\\s*$`);
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (line.includes(tableName) && tablePattern.test(line)) {
        const tableIndex = line.indexOf(tableName);
        return Range.create(index, tableIndex, index, tableIndex + tableName.length);
      }
    }
    return undefined;
  }
}
