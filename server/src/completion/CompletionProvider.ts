import { CompletionItem, CompletionParams, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtRepository } from '../DbtRepository';
import { DestinationContext } from '../DestinationContext';
import { JinjaParser, JinjaPartType } from '../JinjaParser';
import { ProjectAnalyzeResults } from '../ProjectAnalyzeResults';
import { DbtTextDocument } from '../document/DbtTextDocument';
import { DiffUtils } from '../utils/DiffUtils';
import { getWordRangeAtPosition } from '../utils/TextUtils';
import { comparePositions, positionInRange } from '../utils/Utils';
import { DbtCompletionProvider } from './DbtCompletionProvider';
import { SnippetsCompletionProvider } from './SnippetsCompletionProvider';
import { SqlCompletionProvider } from './SqlCompletionProvider';

// string[] is a better signature but this way TS doesn't throw an error
// when using `arr[1] ?? arr[0]`
export type CompletionTextInput = [string, string | undefined];

export class CompletionProvider {
  sqlCompletionProvider = new SqlCompletionProvider();
  snippetsCompletionProvider = new SnippetsCompletionProvider();
  dbtCompletionProvider: DbtCompletionProvider;

  constructor(
    private rawDocument: TextDocument,
    private compiledDocument: TextDocument,
    dbtRepository: DbtRepository,
    private jinjaParser: JinjaParser,
    private destinationContext: DestinationContext,
    private projectAnalyzeResults: ProjectAnalyzeResults,
  ) {
    this.dbtCompletionProvider = new DbtCompletionProvider(dbtRepository);
  }

  async provideCompletionItems(completionParams: CompletionParams): Promise<CompletionItem[]> {
    const dbtCompletionItems = this.provideDbtCompletions(completionParams);
    if (dbtCompletionItems) {
      return dbtCompletionItems;
    }
    const completionText = this.getCompletionText(completionParams);
    const [tableOrColumn, column] = completionText;
    const snippetItems = this.snippetsCompletionProvider.provideSnippets(column ?? tableOrColumn);
    const sqlItems = await this.provideSqlCompletions(completionParams, completionText);
    return [...snippetItems, ...sqlItems];
  }

  private provideDbtCompletions(completionParams: CompletionParams): CompletionItem[] | undefined {
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

  private async provideSqlCompletions(completionParams: CompletionParams, text: CompletionTextInput): Promise<CompletionItem[]> {
    if (this.destinationContext.isEmpty()) {
      return [];
    }

    const queryInformation = this.projectAnalyzeResults.getQueryParseInformationByUri(this.rawDocument.uri);
    let aliases: Map<string, string> | undefined;

    let completionInfo = undefined;
    const astResult = this.projectAnalyzeResults.getAnalyzeResultByUri(this.rawDocument.uri)?.ast;
    if (astResult?.isOk()) {
      const line = DiffUtils.getOldLineNumber(this.compiledDocument.getText(), this.rawDocument.getText(), completionParams.position.line);
      const offset = this.compiledDocument.offsetAt(Position.create(line, completionParams.position.character));
      completionInfo = DbtTextDocument.ZETA_SQL_AST.getCompletionInfo(astResult.value, offset);

      aliases = queryInformation?.selects.find(s => offset >= s.parseLocationRange.start && offset <= s.parseLocationRange.end)?.tableAliases;
    }

    const insideFromClause =
      queryInformation?.selects.some(s => s.fromClause?.rawRange && positionInRange(completionParams.position, s.fromClause.rawRange)) ?? false;

    return this.sqlCompletionProvider.onSqlCompletion(
      text,
      completionParams,
      insideFromClause,
      this.destinationContext.destinationDefinition,
      completionInfo,
      this.destinationContext.getDestination(),
      aliases,
    );
  }

  private getCompletionText(completionParams: CompletionParams): CompletionTextInput {
    const previousPosition = Position.create(
      completionParams.position.line,
      completionParams.position.character > 0 ? completionParams.position.character - 1 : 0,
    );

    return this.rawDocument
      .getText(
        getWordRangeAtPosition(previousPosition, /[.|\w|`]+/, this.rawDocument.getText().split('\n')) ??
          Range.create(previousPosition, previousPosition),
      )
      .split('.') as CompletionTextInput;
  }
}
