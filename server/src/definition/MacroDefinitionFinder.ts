import * as path from 'path';
import { DefinitionLink, integer, LocationLink, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Expression } from '../JinjaParser';
import { ManifestMacro } from '../manifest/ManifestJson';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getAbsoluteRange, getRelativePosition } from '../utils/Utils';

export class MacroDefinitionFinder {
  static readonly MACRO_PATTERN = /(\w+\.?\w+)\s*\(/;
  static readonly DBT_PACKAGE = 'dbt';

  searchMacroDefinitions(
    document: TextDocument,
    position: Position,
    expression: Expression,
    projectName: string,
    dbtMacros: ManifestMacro[],
  ): DefinitionLink[] | undefined {
    const expressionLines = expression.expression.split('\n');

    const relativePosition = getRelativePosition(expression.range, position);
    if (relativePosition === undefined) {
      return undefined;
    }
    const wordRange = getWordRangeAtPosition(relativePosition, MacroDefinitionFinder.MACRO_PATTERN, expressionLines);

    if (wordRange) {
      const word = document.getText(getAbsoluteRange(expression.range.start, wordRange));
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
      return [
        LocationLink.create(
          path.join(selectedMacro.rootPath, selectedMacro.originalFilePath),
          Range.create(Position.create(0, 0), Position.create(integer.MAX_VALUE, integer.MAX_VALUE)),
          Range.create(Position.create(0, 0), Position.create(0, 0)),
          getAbsoluteRange(expression.range.start, wordRange),
        ),
      ];
    }

    return undefined;
  }
}
