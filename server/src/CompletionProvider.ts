import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { CompletionItem, CompletionParams, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtCompletionProvider } from './completion/DbtCompletionProvider';
import { DbtRepository } from './DbtRepository';
import { DestinationState } from './DestinationState';
import { DbtTextDocument } from './document/DbtTextDocument';
import { JinjaParser, JinjaPartType } from './JinjaParser';
import { LogLevel } from './Logger';
import { SnippetsCompletionProvider } from './SnippetsCompletionProvider';
import { SqlCompletionProvider } from './SqlCompletionProvider';
import { DiffUtils } from './utils/DiffUtils';
import { comparePositions, getIdentifierRangeAtPosition } from './utils/Utils';

export class CompletionProvider {
  sqlCompletionProvider = new SqlCompletionProvider();
  snippetsCompletionProvider = new SnippetsCompletionProvider();
  dbtCompletionProvider: DbtCompletionProvider;

  constructor(
    private rawDocument: TextDocument,
    private compiledDocument: TextDocument,
    dbtRepository: DbtRepository,
    private jinjaParser: JinjaParser,
    private destinationState: DestinationState,
  ) {
    this.dbtCompletionProvider = new DbtCompletionProvider(dbtRepository);
  }

  async provideCompletionItems(completionParams: CompletionParams, ast?: AnalyzeResponse): Promise<CompletionItem[]> {
    const dbtCompletionItems = this.provideDbtCompletions(completionParams);
    if (dbtCompletionItems) {
      console.log(`dbtCompletionItems: ${dbtCompletionItems.map(i => i.insertText).join('|')}`, LogLevel.Debug);
      return dbtCompletionItems;
    }
    return this.getSqlCompletions(completionParams, ast);
  }

  provideDbtCompletions(completionParams: CompletionParams): CompletionItem[] | undefined {
    const jinjaParts = this.jinjaParser.findAllJinjaParts(this.rawDocument);
    const jinjasBeforePosition = jinjaParts.filter(p => comparePositions(p.range.start, completionParams.position) < 0);
    const closestJinjaPart =
      jinjasBeforePosition.length > 0
        ? jinjasBeforePosition.reduce((p1, p2) => (comparePositions(p1.range.start, p2.range.start) > 0 ? p1 : p2))
        : undefined;

    if (closestJinjaPart) {
      const jinjaPartType = this.jinjaParser.getJinjaPartType(closestJinjaPart.value);
      if ([JinjaPartType.EXPRESSION_START, JinjaPartType.BLOCK_START].includes(jinjaPartType)) {
        const jinjaBeforePositionText = this.rawDocument.getText(Range.create(closestJinjaPart.range.start, completionParams.position));
        return this.dbtCompletionProvider.provideCompletions(jinjaPartType, jinjaBeforePositionText);
      }
    }

    return undefined;
  }

  async getSqlCompletions(completionParams: CompletionParams, ast?: AnalyzeResponse): Promise<CompletionItem[]> {
    if (!this.destinationState.contextInitialized || !this.destinationState.bigQueryContext) {
      return [];
    }

    const previousPosition = Position.create(
      completionParams.position.line,
      completionParams.position.character > 0 ? completionParams.position.character - 1 : 0,
    );
    const text = this.rawDocument.getText(getIdentifierRangeAtPosition(previousPosition, this.rawDocument.getText()));

    let completionInfo = undefined;
    if (ast) {
      const line = DiffUtils.getOldLineNumber(this.compiledDocument.getText(), this.rawDocument.getText(), completionParams.position.line);
      const offset = this.compiledDocument.offsetAt(Position.create(line, completionParams.position.character));
      completionInfo = DbtTextDocument.ZETA_SQL_AST.getCompletionInfo(ast, offset);
    }
    const snippetItems = this.snippetsCompletionProvider.provideSnippets(text);
    const sqlItems = await this.sqlCompletionProvider.onSqlCompletion(
      text,
      completionParams,
      this.destinationState.bigQueryContext.destinationDefinition,
      completionInfo,
    );
    return [...snippetItems, ...sqlItems];
  }
}
