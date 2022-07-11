import * as fs from 'fs';
import * as path from 'path';
import { DefinitionLink, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtRepository } from '../DbtRepository';
import { ParseNode } from '../JinjaParser';
import { ManifestMacro } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsoluteRange, getPositionByIndex, getRelativePosition } from '../utils/Utils';
import { DbtDefinitionProvider, DbtNodeDefinitionProvider } from './DbtDefinitionProvider';

export class MacroDefinitionProvider implements DbtNodeDefinitionProvider {
  static readonly MACRO_PATTERN = /(\w+\.?\w+)\s*\(/;
  static readonly END_MACRO_PATTERN = /{%-?\s*endmacro\s*-?%}/g;

  constructor(private dbtRepository: DbtRepository) {}

  provideDefinitions(document: TextDocument, position: Position, jinja: ParseNode): DefinitionLink[] | undefined {
    const expressionLines = jinja.value.split('\n');
    const relativePosition = getRelativePosition(jinja.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, MacroDefinitionProvider.MACRO_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(jinja.range.start, wordRange));
      const macroMatch = word.match(MacroDefinitionProvider.MACRO_PATTERN);
      if (macroMatch === null || macroMatch.length < 1) {
        return undefined;
      }

      const [, macro] = macroMatch;

      const pointIndex = macro.indexOf('.');
      const packageIsSpecified = pointIndex !== -1;
      const packageName = packageIsSpecified ? macro.substring(0, pointIndex) : undefined;
      const macroName = packageIsSpecified ? macro.substring(pointIndex + 1) : macro;

      return this.dbtRepository.macros
        .filter(m => m.name === macroName && (!packageIsSpecified || m.packageName === packageName))
        .map((m: ManifestMacro) => {
          const macroFilePath = path.join(m.rootPath, m.originalFilePath);
          const [definitionRange, selectionRange] = this.getMacroRange(m.name, macroFilePath);
          wordRange.end.character -= 1;
          return LocationLink.create(macroFilePath, definitionRange, selectionRange, getAbsoluteRange(jinja.range.start, wordRange));
        });
    }

    return undefined;
  }

  /**
   * Calculates ranges of macro definition
   * @param macro macro name
   * @param macroFilePath file name in which macro is defined
   * @returns macro definition range (all between and including macro and endmacro statements) and macro selection range (macro name within macro statement)
   */
  getMacroRange(macro: string, macroFilePath: string): [Range, Range] {
    const macroDefinitionFileContent = fs.readFileSync(macroFilePath, 'utf8');

    const startMacroMatch = this.getStartMacroMatch(macroDefinitionFileContent, macro);
    const endMacroMatches = this.getEndMacroMatches(macroDefinitionFileContent);

    if (startMacroMatch && endMacroMatches.length > 0) {
      const endMacroMatch = endMacroMatches
        .filter(m => m.index > startMacroMatch.index)
        .reduce((prev, curr) => (prev.index < curr.index ? prev : curr));
      const definitionRange = Range.create(
        getPositionByIndex(macroDefinitionFileContent, startMacroMatch.index),
        getPositionByIndex(macroDefinitionFileContent, endMacroMatch.index + endMacroMatch[0].length),
      );
      const keyWordPosition = getPositionByIndex(macroDefinitionFileContent, startMacroMatch.index + startMacroMatch[0].indexOf(macro));
      const selectionRange = Range.create(keyWordPosition, keyWordPosition);
      return [definitionRange, selectionRange];
    }

    return [DbtDefinitionProvider.MAX_RANGE, DbtDefinitionProvider.MAX_RANGE];
  }

  getStartMacroMatch(text: string, macro: string): RegExpExecArray | null {
    const startMacroPattern = new RegExp(`{%-?\\s*macro\\s*(${macro})\\s*\\(`);
    return startMacroPattern.exec(text);
  }

  getEndMacroMatches(text: string): RegExpExecArray[] {
    const endMacroMatches = [];
    let match: RegExpExecArray | null;
    while ((match = MacroDefinitionProvider.END_MACRO_PATTERN.exec(text))) {
      endMacroMatches.push(match);
    }
    return endMacroMatches;
  }
}
