import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { DbtNodeCompletionProvider } from './DbtCompletionProvider';

export class SourceCompletionProvider implements DbtNodeCompletionProvider {
  static readonly SOURCE_PATTERN = /source\s*\(\s*['|"]?$/;
  static readonly TABLE_PATTERN = /source\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('|")$/;

  constructor(private dbtRepository: DbtRepository) {}

  provideCompletions(jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    const sourceMatch = SourceCompletionProvider.SOURCE_PATTERN.exec(jinjaBeforePositionText);
    if (sourceMatch) {
      const lastChar = jinjaBeforePositionText.charAt(jinjaBeforePositionText.length - 1);
      const completionItems = [];

      for (const packageSources of this.dbtRepository.packageToSourcesMap.entries()) {
        for (const sourceTables of packageSources[1].entries()) {
          const label = `(${packageSources[0]}) ${sourceTables[0]}`;
          const insertText = this.getSourceInsertText(sourceTables[0], lastChar);
          completionItems.push(this.getSourceCompletionItem(label, insertText, 'Source'));
        }
      }

      return Promise.resolve(completionItems);
    }

    const tableMatch = SourceCompletionProvider.TABLE_PATTERN.exec(jinjaBeforePositionText);
    if (tableMatch) {
      const sourceName = tableMatch[1].slice(1, -1);
      return Promise.resolve(
        this.dbtRepository.sources
          .filter(s => s.sourceName === sourceName)
          .map<CompletionItem>(s => {
            const label = this.dbtRepository.projectName === s.packageName ? s.name : `(${s.packageName}) ${s.name}`;
            return this.getSourceCompletionItem(label, s.name, 'Table');
          }),
      );
    }

    return Promise.resolve(undefined);
  }

  private getSourceCompletionItem(label: string, insertText: string, detail: 'Source' | 'Table'): CompletionItem {
    return {
      label,
      insertText,
      kind: CompletionItemKind.Value,
      detail,
    };
  }

  private getSourceInsertText(sourceName: string, lastChar: string): string {
    return lastChar === "'" ? sourceName : `'${sourceName}'`;
  }
}
