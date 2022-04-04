import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { DbtNodeCompletionProvider } from './DbtCompletionProvider';

export class SourceCompletionProvider implements DbtNodeCompletionProvider {
  static readonly SOURCE_PATTERN = /source\s*\(\s*['|"]$/;
  static readonly TABLE_PATTERN = /source\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('|")$/;

  constructor(private dbtRepository: DbtRepository) {}

  provideCompletions(jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    const sourceMatch = SourceCompletionProvider.SOURCE_PATTERN.exec(jinjaBeforePositionText);
    if (sourceMatch) {
      return Promise.resolve(this.dbtRepository.sources.map<CompletionItem>(s => this.getSourceCompletionItem(s.packageName, s.sourceName)));
    }

    const tableMatch = SourceCompletionProvider.TABLE_PATTERN.exec(jinjaBeforePositionText);
    if (tableMatch) {
      const [, sourceName] = tableMatch;
      const searchPattern = new RegExp(`source\\..*\\.${sourceName.length > 0 ? sourceName.slice(1, -1) : '.*'}\\.`);
      return Promise.resolve(
        this.dbtRepository.sources
          .filter(s => s.uniqueId.match(searchPattern))
          .map<CompletionItem>(s => this.getTableCompletionItem(s.packageName, s.name)),
      );
    }

    return Promise.resolve(undefined);
  }

  private getSourceCompletionItem(packageName: string, sourceName: string): CompletionItem {
    return {
      label: `(${packageName}) ${sourceName}`,
      insertText: sourceName,
      kind: CompletionItemKind.Value,
      detail: 'Source',
    };
  }

  private getTableCompletionItem(packageName: string, tableName: string): CompletionItem {
    return {
      label: `(${packageName}) ${tableName}`,
      insertText: tableName,
      kind: CompletionItemKind.Value,
      detail: 'Table',
    };
  }
}
