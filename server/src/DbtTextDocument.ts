import { AnalyzeRequest, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { AnalyzeResponse, AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { err, ok, Result } from 'neverthrow';
import {
  CompletionItem,
  CompletionParams,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeTextDocumentParams,
  Hover,
  HoverParams,
  Position,
  Range,
  SignatureHelp,
  SignatureHelpParams,
  TextDocumentContentChangeEvent,
  TextDocumentItem,
  WorkspaceChange,
  _Connection,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BigQueryClient } from './bigquery/BigQueryClient';
import { CompletionProvider } from './CompletionProvider';
import { DbtRpcServer } from './DbtRpcServer';
import { DestinationDefinition } from './DestinationDefinition';
import { Diff as Diff } from './Diff';
import { HoverProvider } from './HoverProvider';
import { JinjaParser } from './JinjaParser';
import { ModelCompiler } from './ModelCompiler';
import { ProgressReporter } from './ProgressReporter';
import { SchemaTracker } from './SchemaTracker';
import { SignatureHelpProvider } from './SignatureHelpProvider';
import { SqlRefConverter } from './SqlRefConverter';
import { debounce, getIdentifierRangeAtPosition, getJinjaContentOffset } from './Utils';
import { ZetaSqlAst } from './ZetaSqlAst';
import { ZetaSqlCatalog } from './ZetaSqlCatalog';

export class DbtTextDocument {
  static DEBOUNCE_TIMEOUT = 300;

  static readonly ZETA_SQL_AST = new ZetaSqlAst();
  static readonly JINJA_PARSER = new JinjaParser();

  rawDocument: TextDocument;
  compiledDocument: TextDocument;
  requireCompileOnSave: boolean;

  ast: AnalyzeResponse | undefined;
  schemaTracker: SchemaTracker;
  signatureHelpProvider = new SignatureHelpProvider();
  sqlRefConverter = new SqlRefConverter(DbtTextDocument.JINJA_PARSER);

  constructor(
    doc: TextDocumentItem,
    private connection: _Connection,
    private progressReporter: ProgressReporter,
    private completionProvider: CompletionProvider,
    private modelCompiler: ModelCompiler,
    bigQueryClient: BigQueryClient,
  ) {
    this.rawDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.compiledDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.schemaTracker = new SchemaTracker(bigQueryClient);
    this.requireCompileOnSave = false;

    this.modelCompiler.onCompilationError(this.onCompilationError.bind(this));
    this.modelCompiler.onCompilationFinished(this.onCompilationFinished.bind(this));
    this.modelCompiler.onFinishAllCompilationJobs(this.onFinishAllCompilationTasks.bind(this));
  }

  async didSaveTextDocument(dbtRpcServer: DbtRpcServer): Promise<void> {
    if (this.requireCompileOnSave) {
      this.requireCompileOnSave = false;
      dbtRpcServer.refreshServer();
      this.debouncedCompile();
    } else {
      await this.onCompilationFinished(this.compiledDocument.getText());
    }
  }

  didOpenTextDocument(): void {
    this.debouncedCompile();
  }

  didChangeTextDocument(params: DidChangeTextDocumentParams): void {
    if (this.requireCompileOnSave || this.isDbtCompileNeeded(params.contentChanges)) {
      TextDocument.update(this.rawDocument, params.contentChanges, params.textDocument.version);
      this.requireCompileOnSave = true;
    } else {
      const compiledContentChanges = params.contentChanges.map<TextDocumentContentChangeEvent>(c => {
        if (!TextDocumentContentChangeEvent.isIncremental(c)) {
          throw new Error('Incremental updates expected');
        }
        return {
          text: c.text,
          range: Range.create(
            this.convertPosition(this.compiledDocument.getText(), this.rawDocument.getText(), c.range.start),
            this.convertPosition(this.compiledDocument.getText(), this.rawDocument.getText(), c.range.end),
          ),
        };
      });
      TextDocument.update(this.rawDocument, params.contentChanges, params.textDocument.version);
      TextDocument.update(this.compiledDocument, compiledContentChanges, params.textDocument.version);
    }
  }

  convertPosition(first: string, second: string, positionInSecond: Position): Position {
    const lineInFirst = Diff.getOldLineNumber(first, second, positionInSecond.line);
    const charInFirst = Diff.getOldCharacter(first.split('\n')[lineInFirst], second.split('\n')[positionInSecond.line], positionInSecond.character);
    return {
      line: lineInFirst,
      character: charInFirst,
    };
  }

  isDbtCompileNeeded(changes: TextDocumentContentChangeEvent[]): boolean {
    if (this.modelCompiler.compilationInProgress) {
      return true;
    }

    for (const change of changes) {
      if (DbtTextDocument.JINJA_PARSER.hasJinjas(change.text)) {
        return true;
      }
    }

    const jinjas = DbtTextDocument.JINJA_PARSER.findAllJinjaRanges(this.rawDocument);

    return jinjas === undefined || (jinjas.length > 0 && DbtTextDocument.JINJA_PARSER.isJinjaModified(jinjas, changes));
  }

  forceRecompile(): void {
    this.progressReporter.sendStart(this.rawDocument.uri);
    this.debouncedCompile();
  }

  async refToSql(): Promise<void> {
    const workspaceChange = new WorkspaceChange();
    const textChange = workspaceChange.getTextEditChange(this.rawDocument.uri);

    this.sqlRefConverter.refToSql(this.rawDocument, this.completionProvider.dbtModels).forEach(c => {
      textChange.replace(c.range, c.newText);
    });
    await this.connection.workspace.applyEdit(workspaceChange.edit);
  }

  async sqlToRef(): Promise<void> {
    if (!this.ast) {
      return;
    }

    const workspaceChange = new WorkspaceChange();
    const textChange = workspaceChange.getTextEditChange(this.rawDocument.uri);
    const resolvedTables = DbtTextDocument.ZETA_SQL_AST.getResolvedTables(this.ast, this.compiledDocument.getText());

    this.sqlRefConverter.sqlToRef(this.compiledDocument, resolvedTables, this.completionProvider.dbtModels).forEach(c => {
      const range = Range.create(
        this.convertPosition(this.rawDocument.getText(), this.compiledDocument.getText(), c.range.start),
        this.convertPosition(this.rawDocument.getText(), this.compiledDocument.getText(), c.range.end),
      );
      textChange.replace(range, c.newText);
    });
    await this.connection.workspace.applyEdit(workspaceChange.edit);
  }

  debouncedCompile = debounce(async () => {
    this.progressReporter.sendStart(this.rawDocument.uri);
    await this.modelCompiler.compile();
  }, DbtTextDocument.DEBOUNCE_TIMEOUT);

  async sendDiagnostics(dbtCompilationError?: string): Promise<void> {
    if (dbtCompilationError) {
      const dbtDiagnostics: Diagnostic[] = [
        {
          severity: DiagnosticSeverity.Error,
          range: Range.create(0, 0, 0, 100),
          message: dbtCompilationError,
        },
      ];

      this.connection.sendDiagnostics({ uri: this.rawDocument.uri, diagnostics: dbtDiagnostics });
      return;
    }

    const rawDocDiagnostics: Diagnostic[] = [];
    const compiledDocDiagnostics: Diagnostic[] = [];

    const astOrError = await this.getAstOrError();
    if (astOrError.isOk()) {
      this.ast = astOrError.value;
    } else {
      // Parse string like 'Unrecognized name: paused1; Did you mean paused? [at 9:3]'
      const matchResults = astOrError.error.match(/(.*?) \[at (\d+):(\d+)\]/);
      if (matchResults) {
        const [, errorText] = matchResults;
        const lineInCompiledDoc = Number(matchResults[2]) - 1;
        const characterInCompiledDoc = Number(matchResults[3]) - 1;
        const lineInRawDoc = Diff.getOldLineNumber(this.rawDocument.getText(), this.compiledDocument.getText(), lineInCompiledDoc);

        rawDocDiagnostics.push(this.createDiagnostic(this.rawDocument.getText(), lineInRawDoc, characterInCompiledDoc, errorText));
        compiledDocDiagnostics.push(this.createDiagnostic(this.compiledDocument.getText(), lineInCompiledDoc, characterInCompiledDoc, errorText));
      }
    }
    this.connection.sendDiagnostics({ uri: this.rawDocument.uri, diagnostics: rawDocDiagnostics });
    this.connection.sendDiagnostics({ uri: 'query-preview:Preview?dbt-language-server', diagnostics: compiledDocDiagnostics });
  }

  createDiagnostic(docText: string, line: number, character: number, message: string): Diagnostic {
    const position = Position.create(line, character);
    const range = getIdentifierRangeAtPosition(position, docText);
    return {
      severity: DiagnosticSeverity.Error,
      range,
      message,
    };
  }

  async getAstOrError(): Promise<Result<AnalyzeResponse__Output, string>> {
    const analyzeRequest: AnalyzeRequest = {
      sqlStatement: this.compiledDocument.getText(),
      registeredCatalogId: ZetaSqlCatalog.getInstance().catalog.registeredId,

      options: {
        parseLocationRecordType: ParseLocationRecordType.PARSE_LOCATION_RECORD_CODE_SEARCH,

        errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
        languageOptions: ZetaSqlCatalog.getInstance().catalog.builtinFunctionOptions.languageOptions,
      },
    };

    try {
      const ast = await ZetaSQLClient.getInstance().analyze(analyzeRequest);
      console.log('AST was successfully received');
      return ok(ast);
    } catch (e: any) {
      console.log('There was an error wile parsing SQL query');
      return err(e.details);
    }
  }

  async ensureCatalogInitialized(): Promise<void> {
    await this.schemaTracker.refreshTableNames(this.compiledDocument.getText());
    if (this.schemaTracker.hasNewTables || !ZetaSqlCatalog.getInstance().isRegistered()) {
      await this.registerCatalog();
    }
  }

  async registerCatalog(): Promise<void> {
    await ZetaSqlCatalog.getInstance().register(this.schemaTracker.tableDefinitions);
    this.schemaTracker.resetHasNewTables();
  }

  async onCompilationError(dbtCompilationError: string): Promise<void> {
    this.connection.sendNotification('custom/updateQueryPreview', [this.rawDocument.uri, this.rawDocument.getText()]);
    await this.sendDiagnostics(dbtCompilationError);
  }

  async onCompilationFinished(compiledSql: string): Promise<void> {
    TextDocument.update(this.compiledDocument, [{ text: compiledSql }], this.compiledDocument.version);

    await this.ensureCatalogInitialized();
    this.connection.sendNotification('custom/updateQueryPreview', [this.rawDocument.uri, compiledSql]);
    await this.sendDiagnostics();

    if (!this.modelCompiler.compilationInProgress) {
      this.progressReporter.sendFinish(this.rawDocument.uri);
    }
  }

  onFinishAllCompilationTasks(): void {
    this.progressReporter.sendFinish(this.rawDocument.uri);
  }

  onHover(hoverParams: HoverParams): Hover | null {
    const range = getIdentifierRangeAtPosition(hoverParams.position, this.rawDocument.getText());
    const text = this.rawDocument.getText(range);
    return HoverProvider.hoverOnText(text, this.ast);
  }

  async onCompletion(completionParams: CompletionParams, destinationDefinition: DestinationDefinition): Promise<CompletionItem[] | undefined> {
    const previousPosition = Position.create(
      completionParams.position.line,
      completionParams.position.character > 0 ? completionParams.position.character - 1 : 0,
    );
    const text = this.rawDocument.getText(getIdentifierRangeAtPosition(previousPosition, this.rawDocument.getText()));

    const jinjaContentOffset = getJinjaContentOffset(this.rawDocument, completionParams.position);
    if (jinjaContentOffset !== -1) {
      return this.completionProvider.onJinjaCompletion(
        this.rawDocument.getText(Range.create(this.rawDocument.positionAt(jinjaContentOffset), completionParams.position)),
      );
    }
    if (['(', '"', "'"].includes(completionParams.context?.triggerCharacter ?? '')) {
      return undefined;
    }

    let completionInfo = undefined;
    if (this.ast) {
      const line = Diff.getOldLineNumber(this.compiledDocument.getText(), this.rawDocument.getText(), completionParams.position.line);
      const offset = this.compiledDocument.offsetAt(Position.create(line, completionParams.position.character));
      completionInfo = DbtTextDocument.ZETA_SQL_AST.getCompletionInfo(this.ast, offset);
    }
    return this.completionProvider.onSqlCompletion(text, completionParams, destinationDefinition, completionInfo);
  }

  onSignatureHelp(params: SignatureHelpParams): SignatureHelp | undefined {
    const text = this.rawDocument.getText(this.getTextRangeBeforeBracket(params.position));
    return this.signatureHelpProvider.onSignatureHelp(params, text);
  }

  getTextRangeBeforeBracket(cursorPosition: Position): Range {
    const lines = this.rawDocument.getText().split('\n');
    if (!lines) {
      return Range.create(cursorPosition, cursorPosition);
    }
    const line = Math.min(lines.length - 1, Math.max(0, cursorPosition.line));
    const lineText = lines[line];
    const textBeforeCursor = lineText.substr(0, cursorPosition.character);
    const openBracketIndex = textBeforeCursor.lastIndexOf('(');
    if (openBracketIndex === -1) {
      return Range.create(cursorPosition, cursorPosition);
    }
    const closeBracketIndex = textBeforeCursor.lastIndexOf(')');
    if (closeBracketIndex > openBracketIndex) {
      return Range.create(cursorPosition, cursorPosition);
    }
    const spaceIndex = textBeforeCursor.substr(0, openBracketIndex).lastIndexOf(' ');
    return Range.create(line, spaceIndex + 1, line, openBracketIndex);
  }
}
