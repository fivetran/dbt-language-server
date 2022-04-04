import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { ParseNode } from '../JinjaParser';

export class SourceCompletionProvider {
  static readonly SOURCE_PATTERN = /source\s*\(\s*['|"]$/;
  static readonly TABLE_PATTERN = /source\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('|")$/;

  constructor(private dbtRepository: DbtRepository) {}

  provideCompletions(completionParams: CompletionParams, jinja: ParseNode, jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    const sourceMatch = SourceCompletionProvider.SOURCE_PATTERN.exec(jinjaBeforePositionText);
    if (sourceMatch) {
      return Promise.resolve(this.dbtRepository.sources.map<CompletionItem>(s => this.getCompletionItem(s.sourceName, 'Source')));
    }

    const tableMatch = SourceCompletionProvider.TABLE_PATTERN.exec(jinjaBeforePositionText);
    if (tableMatch) {
      const [, sourceName] = tableMatch;
      const searchPattern = new RegExp(
        `source\\.${this.dbtRepository.projectName ?? '.*'}\\.${sourceName.length > 0 ? sourceName.slice(1, -1) : '.*'}\\.`,
      );
      return Promise.resolve(
        this.dbtRepository.sources.filter(s => s.uniqueId.match(searchPattern)).map<CompletionItem>(s => this.getCompletionItem(s.name, 'Table')),
      );
    }

    return Promise.resolve(undefined);
  }

  private getCompletionItem(name: string, detail: 'Source' | 'Table'): CompletionItem {
    return {
      label: name,
      kind: CompletionItemKind.Value,
      detail,
    };
  }
}
