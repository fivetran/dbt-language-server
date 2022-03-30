import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { DbtNodeCompletionProvider } from './DbtCompletionProvider';

export class ModelCompletionProvider implements DbtNodeCompletionProvider {
  static readonly MODEL_PATTERN = /ref\s*\(\s*['|"]$/;
  static readonly PACKAGE_PATTERN = /ref\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('|")$/;

  constructor(private dbtRepository: DbtRepository) {}

  provideCompletions(completionParams: CompletionParams, jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    const modelMatch = ModelCompletionProvider.MODEL_PATTERN.exec(jinjaBeforePositionText);
    if (modelMatch) {
      return Promise.resolve(
        this.dbtRepository.models
          .filter(m => (this.dbtRepository.projectName ? m.uniqueId.startsWith(`model.${this.dbtRepository.projectName}.`) : true))
          .map<CompletionItem>(m => this.getModelCompletionItem(m.name)),
      );
    }

    const packageMatch = ModelCompletionProvider.PACKAGE_PATTERN.exec(jinjaBeforePositionText);
    if (packageMatch) {
      const [, dbtPackage] = packageMatch;
      return Promise.resolve(
        this.dbtRepository.models
          .filter(m => (dbtPackage.length > 0 ? m.uniqueId.startsWith(`model.${dbtPackage.slice(1, -1)}.`) : true))
          .map<CompletionItem>(m => this.getModelCompletionItem(m.name)),
      );
    }

    return Promise.resolve(undefined);
  }

  private getModelCompletionItem(name: string): CompletionItem {
    return {
      label: name,
      kind: CompletionItemKind.Value,
      detail: 'Model',
    };
  }
}
