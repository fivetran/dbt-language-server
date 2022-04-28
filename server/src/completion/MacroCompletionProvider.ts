import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { JinjaPartType } from '../JinjaParser';
import { DbtNodeCompletionProvider } from './DbtCompletionProvider';

export class MacroCompletionProvider implements DbtNodeCompletionProvider {
  static readonly MACRO_PATTERN = /\w+\.$/;
  static readonly WORD_PATTERN = /\w+$/;

  static readonly ACCEPTABLE_JINJA_PARTS = [JinjaPartType.EXPRESSION_START, JinjaPartType.BLOCK_START];

  static readonly CURRENT_PACKAGE_SORT_PREFIX = '1';
  static readonly INSTALLED_PACKAGE_SORT_PREFIX = '2';

  constructor(private dbtRepository: DbtRepository) {}

  async provideCompletions(jinjaPartType: JinjaPartType, jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    if (!MacroCompletionProvider.ACCEPTABLE_JINJA_PARTS.includes(jinjaPartType)) {
      console.log('node acceptable jinja part');
      return undefined;
    }

    const macroMatch = MacroCompletionProvider.MACRO_PATTERN.exec(jinjaBeforePositionText);
    if (macroMatch) {
      console.log('macroMatch');
      const packageName = macroMatch[0].slice(0, -1);
      const packageMacros = this.dbtRepository.packageToMacros.get(packageName);
      return packageMacros ? [...packageMacros].map<CompletionItem>(m => this.getMacroCompletionItem(m.name)) : undefined;
    }

    const wordMatch = MacroCompletionProvider.WORD_PATTERN.exec(jinjaBeforePositionText);
    if (wordMatch) {
      console.log('wordMatch');
      console.log(this.dbtRepository.macros.length);
      return this.dbtRepository.macros.map<CompletionItem>(m => {
        if (m.packageName === this.dbtRepository.projectName) {
          return this.getMacroCompletionItem(m.name, m.name, `${MacroCompletionProvider.CURRENT_PACKAGE_SORT_PREFIX}_${m.name}`);
        }

        const label = `(${m.packageName}) ${m.name}`;
        const insertText = `${m.packageName}.${m.name}`;
        return this.getMacroCompletionItem(label, insertText, `${MacroCompletionProvider.INSTALLED_PACKAGE_SORT_PREFIX}_${label}`);
      });
    }
    console.log('return undefined');
    return Promise.resolve(undefined);
  }

  private getMacroCompletionItem(label: string, insertText?: string, sortText?: string): CompletionItem {
    return {
      label,
      insertText: insertText ?? label,
      kind: CompletionItemKind.Value,
      detail: 'Macro',
      sortText,
    };
  }
}
