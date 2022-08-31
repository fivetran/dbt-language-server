import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { JinjaPartType } from '../JinjaParser';
import { StringBuilder } from '../utils/StringBuilder';
import { truncateAtBothSides } from '../utils/Utils';
import { DbtNodeCompletionProvider } from './DbtCompletionProvider';

export class ModelCompletionProvider implements DbtNodeCompletionProvider {
  static readonly MODEL_PATTERN = /ref\s*\(\s*(['|"])?\s*\w*$/;
  static readonly PACKAGE_PATTERN = /ref\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('|")\s*\w*$/;

  static readonly ACCEPTABLE_JINJA_PARTS = [JinjaPartType.EXPRESSION_START];

  static readonly CURRENT_PACKAGE_SORT_PREFIX = '1';
  static readonly INSTALLED_PACKAGE_SORT_PREFIX = '2';

  constructor(private dbtRepository: DbtRepository) {}

  provideCompletions(jinjaPartType: JinjaPartType, jinjaBeforePositionText: string): CompletionItem[] | undefined {
    if (!ModelCompletionProvider.ACCEPTABLE_JINJA_PARTS.includes(jinjaPartType)) {
      return undefined;
    }

    const modelMatch = ModelCompletionProvider.MODEL_PATTERN.exec(jinjaBeforePositionText);
    if (modelMatch) {
      const quoteSymbol = modelMatch.length >= 2 ? modelMatch[1] : undefined;
      return this.dbtRepository.models.map<CompletionItem>(m => {
        const label = `(${m.packageName}) ${m.name}`;
        const insertText = this.getModelInsertText(m.packageName, m.name, quoteSymbol);
        const sortOrder =
          this.dbtRepository.projectName === m.packageName
            ? `${ModelCompletionProvider.CURRENT_PACKAGE_SORT_PREFIX}_${label}`
            : `${ModelCompletionProvider.INSTALLED_PACKAGE_SORT_PREFIX}_${label}`;
        return this.getModelCompletionItem(label, insertText, sortOrder);
      });
    }

    const packageMatch = ModelCompletionProvider.PACKAGE_PATTERN.exec(jinjaBeforePositionText);
    if (packageMatch) {
      const [, dbtPackageMatch] = packageMatch;
      const dbtPackage = truncateAtBothSides(dbtPackageMatch);
      const packageModels = this.dbtRepository.packageToModels.get(dbtPackage);
      return packageModels ? [...packageModels].map<CompletionItem>(m => this.getModelCompletionItem(m.name, m.name)) : undefined;
    }

    return undefined;
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

  private getModelInsertText(packageName: string, name: string, quoteSymbolParam: string | undefined): string {
    const isQuoteProvided = quoteSymbolParam !== undefined;
    const quoteSymbol = isQuoteProvided ? quoteSymbolParam : "'";

    if (this.dbtRepository.projectName === packageName) {
      return new StringBuilder().append(name).wrapIf(!isQuoteProvided, quoteSymbol).toString();
    }

    return new StringBuilder()
      .append(packageName)
      .append(quoteSymbol)
      .append(', ')
      .append(quoteSymbol)
      .append(name)
      .wrapIf(!isQuoteProvided, quoteSymbol)
      .toString();
  }
}
