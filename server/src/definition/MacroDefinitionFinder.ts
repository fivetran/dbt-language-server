import * as fs from 'fs';
import * as path from 'path';
import { DefinitionLink, integer, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ParseNode } from '../JinjaParser';
import { ManifestMacro } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsoluteRange, getPositionByIndex, getRelativePosition } from '../utils/Utils';

export class MacroDefinitionFinder {
  static readonly MACRO_PATTERN = /(\w+\.?\w+)\s*\(/;
  static readonly DBT_PACKAGE = 'dbt';

  searchMacroDefinitions(
    document: TextDocument,
    position: Position,
    jinja: ParseNode,
    projectName: string,
    dbtMacros: ManifestMacro[],
  ): DefinitionLink[] | undefined {
    const expressionLines = jinja.value.split('\n');
    const relativePosition = getRelativePosition(jinja.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, MacroDefinitionFinder.MACRO_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(jinja.range.start, wordRange));
      const macroMatch = word.match(MacroDefinitionFinder.MACRO_PATTERN);
      if (macroMatch === null) {
        return undefined;
      }
      if (macroMatch.length < 1) {
        return undefined;
      }

      const [, macro] = macroMatch;
      const macroSearchIds = macro.includes('.')
        ? [`macro.${macro}`]
        : [`macro.${MacroDefinitionFinder.DBT_PACKAGE}.${macro}`, `macro.${projectName}.${macro}`];
      const macrosSearch = dbtMacros.filter(m => macroSearchIds.includes(m.uniqueId));
      if (macrosSearch.length === 0) {
        return undefined;
      }

      const [selectedMacro] = macrosSearch;
      const macroFilePath = path.join(selectedMacro.rootPath, selectedMacro.originalFilePath);
      const [definitionRange, selectionRange] = this.getMacroRange(selectedMacro.name, macroFilePath);

      wordRange.end.character -= 1;
      return [LocationLink.create(macroFilePath, definitionRange, selectionRange, getAbsoluteRange(jinja.range.start, wordRange))];
    }

    return undefined;
  }

  getMacroRange(macro: string, macroFilePath: string): [Range, Range] {
    const macroDefinitionFileContent = fs.readFileSync(macroFilePath, 'utf8');

    const startMacroPattern = new RegExp(`{%\\s*macro\\s*(?<macro_name>${macro})\\s*\\(`);
    const startMacroMatch = startMacroPattern.exec(macroDefinitionFileContent);

    const endMacroPattern = /{%\s*endmacro\s*%}/g;
    const endMacroMatches = [];
    let match: RegExpExecArray | null;
    while ((match = endMacroPattern.exec(macroDefinitionFileContent))) {
      endMacroMatches.push(match);
    }

    if (startMacroMatch && endMacroMatches.length > 0) {
      const endMacroMatch = endMacroMatches
        .filter(m => m.index > startMacroMatch.index)
        .reduce((prev, curr) => (prev.index < curr.index ? prev : curr));
      const definitionRange = Range.create(
        getPositionByIndex(macroDefinitionFileContent, startMacroMatch.index),
        getPositionByIndex(macroDefinitionFileContent, endMacroMatch.index + endMacroMatch[0].length),
      );
      const selectionRange = Range.create(
        getPositionByIndex(macroDefinitionFileContent, startMacroMatch.index + startMacroMatch[0].indexOf(macro)),
        getPositionByIndex(macroDefinitionFileContent, startMacroMatch.index + startMacroMatch[0].indexOf(macro) + macro.length),
      );
      return [definitionRange, selectionRange];
    }

    return [
      Range.create(Position.create(0, 0), Position.create(integer.MAX_VALUE, integer.MAX_VALUE)),
      Range.create(Position.create(0, 0), Position.create(integer.MAX_VALUE, integer.MAX_VALUE)),
    ];
  }
}
