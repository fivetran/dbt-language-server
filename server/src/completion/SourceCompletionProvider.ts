import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { JinjaPartType } from '../JinjaParser';
import { StringBuilder } from '../utils/StringBuilder';
import { truncateAtBothSides } from '../utils/Utils';
import { DbtNodeCompletionProvider } from './DbtCompletionProvider';

export class SourceCompletionProvider implements DbtNodeCompletionProvider {
  static readonly SOURCE_PATTERN = /source\s*\(\s*(['|"])?\s*\w*$/;
  static readonly TABLE_PATTERN = /source\s*\(\s*('[^)']*'|"[^)"]*")\s*,\s*('|")\s*\w*$/;

  static readonly ACCEPTABLE_JINJA_PARTS = [JinjaPartType.EXPRESSION_START];

  constructor(private dbtRepository: DbtRepository) {}

  provideCompletions(jinjaPartType: JinjaPartType, jinjaBeforePositionText: string): CompletionItem[] | undefined {
    if (!SourceCompletionProvider.ACCEPTABLE_JINJA_PARTS.includes(jinjaPartType)) {
      return undefined;
    }

    const sourceMatch = SourceCompletionProvider.SOURCE_PATTERN.exec(jinjaBeforePositionText);
    if (sourceMatch) {
      const quoteSymbol = sourceMatch.length >= 2 ? sourceMatch[1] : undefined;
      const completionItems = [];

      for (const packageSources of this.dbtRepository.packageToSources.entries()) {
        for (const sourceTables of packageSources[1].entries()) {
          const label = `(${packageSources[0]}) ${sourceTables[0]}`;
          const insertText = this.getSourceInsertText(sourceTables[0], quoteSymbol);
          completionItems.push(this.getSourceCompletionItem(label, insertText, 'Source'));
        }
      }

      return completionItems;
    }

    const tableMatch = SourceCompletionProvider.TABLE_PATTERN.exec(jinjaBeforePositionText);
    if (tableMatch) {
      const sourceName = truncateAtBothSides(tableMatch[1]);
      return this.dbtRepository.sources
        .filter(s => s.sourceName === sourceName)
        .map<CompletionItem>(s => {
          const label = this.dbtRepository.projectName === s.packageName ? s.name : `(${s.packageName}) ${s.name}`;
          return this.getSourceCompletionItem(label, s.name, 'Table');
        });
    }

    return undefined;
  }

  private getSourceCompletionItem(label: string, insertText: string, detail: 'Source' | 'Table'): CompletionItem {
    return {
      label,
      insertText,
      kind: CompletionItemKind.Value,
      detail,
    };
  }

  private getSourceInsertText(sourceName: string, quoteSymbolParam: string | undefined): string {
    const isQuoteProvided = quoteSymbolParam !== undefined;
    const quoteSymbol = isQuoteProvided ? quoteSymbolParam : "'";
    return new StringBuilder().append(sourceName).wrapIf(!isQuoteProvided, quoteSymbol).toString();
  }
}
