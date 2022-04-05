import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { DbtNodeCompletionProvider } from './DbtCompletionProvider';

export class SourceCompletionProvider implements DbtNodeCompletionProvider {
  static readonly SOURCE_PATTERN = /source\s*\(\s*['|"]?$/;
  static readonly TABLE_PATTERN = /source\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('|")$/;

  static readonly CURRENT_PACKAGE_SORT_PREFIX = '1';
  static readonly INSTALLED_PACKAGE_SORT_PREFIX = '2';

  constructor(private dbtRepository: DbtRepository) {}

  provideCompletions(jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    const sourceMatch = SourceCompletionProvider.SOURCE_PATTERN.exec(jinjaBeforePositionText);
    if (sourceMatch) {
      const lastChar = jinjaBeforePositionText.charAt(jinjaBeforePositionText.length - 1);
      return Promise.resolve(
        this.dbtRepository.sources.map<CompletionItem>(s => {
          const label = `(${s.packageName}) ${s.sourceName}.${s.name}`;
          const insertText = this.getSourceInsertText(s.sourceName, s.name, lastChar);
          const sortOrder =
            this.dbtRepository.projectName === s.packageName
              ? `${SourceCompletionProvider.CURRENT_PACKAGE_SORT_PREFIX}_${label}`
              : `${SourceCompletionProvider.INSTALLED_PACKAGE_SORT_PREFIX}_${label}`;
          return this.getSourceCompletionItem(label, insertText, 'Source', sortOrder);
        }),
      );
    }

    const tableMatch = SourceCompletionProvider.TABLE_PATTERN.exec(jinjaBeforePositionText);
    if (tableMatch) {
      const sourceName = tableMatch[1].slice(1, -1);
      return Promise.resolve(
        this.dbtRepository.sources
          .filter(s => s.sourceName === sourceName)
          .map<CompletionItem>(s => {
            const label = this.dbtRepository.projectName === s.packageName ? s.name : `(${s.packageName}) ${s.name}`;
            const insertText = s.name;
            const sortOrder =
              this.dbtRepository.projectName === s.packageName
                ? `${SourceCompletionProvider.CURRENT_PACKAGE_SORT_PREFIX}_${label}`
                : `${SourceCompletionProvider.INSTALLED_PACKAGE_SORT_PREFIX}_${label}`;
            return this.getSourceCompletionItem(label, insertText, 'Table', sortOrder);
          }),
      );
    }

    return Promise.resolve(undefined);
  }

  private getSourceCompletionItem(label: string, insertText: string, detail: 'Source' | 'Table', sortText?: string): CompletionItem {
    return {
      label,
      insertText,
      sortText,
      kind: CompletionItemKind.Value,
      detail,
    };
  }

  private getSourceInsertText(sourceName: string, tableName: string, lastChar: string): string {
    return lastChar === "'" ? `${sourceName}', '${tableName}` : `'${sourceName}', '${tableName}'`;
  }
}
