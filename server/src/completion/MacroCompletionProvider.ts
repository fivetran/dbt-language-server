import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { ParseNode } from '../JinjaParser';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { getRelativePosition } from '../utils/Utils';
import { DbtNodeCompletionProvider } from './DbtCompletionProvider';

export class MacroCompletionProvider implements DbtNodeCompletionProvider {
  static readonly MACRO_PATTERN = /\w+\./;
  static readonly WORD_PATTERN = /\w+/;
  static readonly DBT_PACKAGE = 'dbt';

  constructor(private dbtRepository: DbtRepository) {}

  provideCompletions(completionParams: CompletionParams, jinja: ParseNode, jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    const macroMatch = MacroCompletionProvider.MACRO_PATTERN.exec(jinjaBeforePositionText);
    if (macroMatch) {
      return Promise.resolve(
        this.dbtRepository.macros
          .filter(m => m.uniqueId.startsWith(`macro.${macroMatch[0].slice(0, -1)}.`))
          .map<CompletionItem>(m => this.getMacroCompletionItem(m.name)),
      );
    }

    const expressionLines = jinja.value.split('\n');
    const relativePosition = getRelativePosition(jinja.range, completionParams.position);
    if (relativePosition === undefined) {
      return Promise.resolve(undefined);
    }

    const wordRange = getWordRangeAtPosition(relativePosition, MacroCompletionProvider.WORD_PATTERN, expressionLines);
    if (wordRange) {
      return Promise.resolve(
        this.dbtRepository.macros.map<CompletionItem>(m => {
          if (
            m.uniqueId.startsWith(`macro.${MacroCompletionProvider.DBT_PACKAGE}.`) ||
            (this.dbtRepository.projectName && m.uniqueId.startsWith(`macro.${this.dbtRepository.projectName}.`))
          ) {
            return this.getMacroCompletionItem(m.name);
          }
          return this.getMacroCompletionItem(m.uniqueId.substring(6));
        }),
      );
    }

    return Promise.resolve(undefined);
  }

  private getMacroCompletionItem(name: string): CompletionItem {
    return {
      label: name,
      kind: CompletionItemKind.Value,
      detail: 'Macro',
    };
  }
}
