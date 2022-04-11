import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { StringBuilder } from '../utils/StringBuilder';
import { isQuote } from '../utils/TextUtils';
import { DbtNodeCompletionProvider } from './DbtCompletionProvider';

export class ModelCompletionProvider implements DbtNodeCompletionProvider {
  static readonly MODEL_PATTERN = /ref\s*\(\s*['|"]?$/;
  static readonly PACKAGE_PATTERN = /ref\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('|")$/;

  static readonly CURRENT_PACKAGE_SORT_PREFIX = '1';
  static readonly INSTALLED_PACKAGE_SORT_PREFIX = '2';

  constructor(private dbtRepository: DbtRepository) {}

  provideCompletions(jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    const modelMatch = ModelCompletionProvider.MODEL_PATTERN.exec(jinjaBeforePositionText);
    if (modelMatch) {
      const lastChar = jinjaBeforePositionText.charAt(jinjaBeforePositionText.length - 1);
      return Promise.resolve(
        this.dbtRepository.models.map<CompletionItem>(m => {
          const label = `(${m.packageName}) ${m.name}`;
          const insertText = this.getModelInsertText(m.packageName, m.name, lastChar);
          const sortOrder =
            this.dbtRepository.projectName === m.packageName
              ? `${ModelCompletionProvider.CURRENT_PACKAGE_SORT_PREFIX}_${label}`
              : `${ModelCompletionProvider.INSTALLED_PACKAGE_SORT_PREFIX}_${label}`;
          return this.getModelCompletionItem(label, insertText, sortOrder);
        }),
      );
    }

    const packageMatch = ModelCompletionProvider.PACKAGE_PATTERN.exec(jinjaBeforePositionText);
    if (packageMatch) {
      const [, dbtPackageMatch] = packageMatch;
      const dbtPackage = dbtPackageMatch.slice(1, -1);
      const packageModels = this.dbtRepository.packageToModels.get(dbtPackage);
      return Promise.resolve(
        packageModels ? Array.from(packageModels).map<CompletionItem>(m => this.getModelCompletionItem(m.name, m.name)) : undefined,
      );
    }

    return Promise.resolve(undefined);
  }

  private getModelCompletionItem(label: string, insertText: string, sortText?: string): CompletionItem {
    return {
      label,
      insertText,
      sortText,
      kind: CompletionItemKind.Value,
      detail: 'Model',
    };
  }

  private getModelInsertText(packageName: string, name: string, lastChar: string): string {
    const lastCharIsQuote = isQuote(lastChar);

    if (this.dbtRepository.projectName === packageName) {
      return new StringBuilder().appendIf(!lastCharIsQuote, "'").append(name).appendIf(!lastCharIsQuote, "'").toString();
    }

    return new StringBuilder()
      .appendIf(!lastCharIsQuote, "'")
      .append(packageName)
      .appendIf(!lastCharIsQuote, "'")
      .appendIf(lastCharIsQuote, lastChar)
      .append(', ')
      .appendIf(!lastCharIsQuote, "'")
      .appendIf(lastCharIsQuote, lastChar)
      .append(name)
      .appendIf(!lastCharIsQuote, "'")
      .toString();
  }
}
