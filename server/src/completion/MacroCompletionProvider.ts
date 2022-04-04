import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { ParseNode } from '../JinjaParser';
import { DbtNodeCompletionProvider } from './DbtCompletionProvider';

export class MacroCompletionProvider implements DbtNodeCompletionProvider {
  static readonly MACRO_PATTERN = /\w+\.$/;
  static readonly WORD_PATTERN = /\w+$/;
  static readonly DBT_PACKAGE = 'dbt';

  constructor(private dbtRepository: DbtRepository) {}

  provideCompletions(completionParams: CompletionParams, jinja: ParseNode, jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    const macroMatch = MacroCompletionProvider.MACRO_PATTERN.exec(jinjaBeforePositionText);
    if (macroMatch) {
      const packageName = macroMatch[0].slice(0, -1);
      return Promise.resolve(
        this.dbtRepository.macros
          .filter(m => m.uniqueId.startsWith(`macro.${packageName}.`))
          .map<CompletionItem>(m => this.getMacroCompletionItem(m.name)),
      );
    }

    const wordMatch = MacroCompletionProvider.WORD_PATTERN.exec(jinjaBeforePositionText);
    if (wordMatch) {
      return Promise.resolve(
        this.dbtRepository.macros.map<CompletionItem>(m => {
          if (
            m.uniqueId.startsWith(`macro.${MacroCompletionProvider.DBT_PACKAGE}.`) ||
            (this.dbtRepository.projectName && m.uniqueId.startsWith(`macro.${this.dbtRepository.projectName}.`))
          ) {
            return this.getMacroCompletionItem(m.name);
          }
          return this.getMacroCompletionItem(`(${m.packageName}) ${m.name}`, `${m.packageName}.${m.name}`);
        }),
      );
    }

    return Promise.resolve(undefined);
  }

  private getMacroCompletionItem(label: string, insertText?: string): CompletionItem {
    return {
      label,
      insertText: insertText ?? label,
      kind: CompletionItemKind.Value,
      detail: 'Macro',
    };
  }
}
