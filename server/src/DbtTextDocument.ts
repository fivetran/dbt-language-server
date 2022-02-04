import { AnalyzeRequest, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { AnalyzeResponse, AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { err, ok, Result } from 'neverthrow';
import {
  CompletionItem,
  CompletionParams,
  DefinitionLink,
  DefinitionParams,
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
  TextDocumentSaveReason,
  VersionedTextDocumentIdentifier,
  WorkspaceChange,
  _Connection,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionProvider } from './CompletionProvider';
import { DbtRpcServer } from './DbtRpcServer';
import { JinjaDefinitionProvider } from './definition/JinjaDefinitionProvider';
import { DestinationDefinition } from './DestinationDefinition';
import { Diff as Diff } from './Diff';
import { HoverProvider } from './HoverProvider';
import { JinjaParser } from './JinjaParser';
import { ModelCompiler } from './ModelCompiler';
import { ProgressReporter } from './ProgressReporter';
import { SchemaTracker } from './SchemaTracker';
import { SignatureHelpProvider } from './SignatureHelpProvider';
import { SqlRefConverter } from './SqlRefConverter';
import { debounce, getIdentifierRangeAtPosition, getJinjaContentOffset, positionInRange } from './utils/Utils';
import { ZetaSqlAst } from './ZetaSqlAst';
import { ZetaSqlCatalog } from './ZetaSqlCatalog';

export class DbtTextDocument {
  static DEBOUNCE_TIMEOUT = 300;

  static readonly ZETA_SQL_AST = new ZetaSqlAst();

  rawDocument: TextDocument;
  compiledDocument: TextDocument;
  requireCompileOnSave: boolean;

  ast?: AnalyzeResponse;
  signatureHelpProvider = new SignatureHelpProvider();
  sqlRefConverter = new SqlRefConverter(this.jinjaParser);

  firstSave = true;

  constructor(
    doc: TextDocumentItem,
    private connection: _Connection,
    private progressReporter: ProgressReporter,
    private completionProvider: CompletionProvider,
    private jinjaDefinitionProvider: JinjaDefinitionProvider,
    private modelCompiler: ModelCompiler,
    private jinjaParser: JinjaParser,
    private schemaTracker: SchemaTracker,
    private zetaSqlCatalog: ZetaSqlCatalog,
    private zetaSqlClient: ZetaSQLClient,
  ) {
    this.rawDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.compiledDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.requireCompileOnSave = false;

    this.modelCompiler.onCompilationError(this.onCompilationError.bind(this));
    this.modelCompiler.onCompilationFinished(this.onCompilationFinished.bind(this));
    this.modelCompiler.onFinishAllCompilationJobs(this.onFinishAllCompilationTasks.bind(this));
  }

  willSaveTextDocument(reason: TextDocumentSaveReason): void {
    // Document can be modified and not saved before language server initialized, in this case we need to compile it on first save command call (see unit test).
    if (
      this.firstSave &&
      !this.requireCompileOnSave &&
      reason !== TextDocumentSaveReason.AfterDelay &&
      this.jinjaParser.hasJinjas(this.rawDocument.getText())
    ) {
      this.requireCompileOnSave = true;
    }
    this.firstSave = false;
  }

  async didSaveTextDocument(dbtRpcServer?: DbtRpcServer): Promise<void> {
    if (this.requireCompileOnSave) {
      this.requireCompileOnSave = false;
      dbtRpcServer?.refreshServer();
      this.debouncedCompile();
    } else {
      await this.onCompilationFinished(this.compiledDocument.getText());
    }
  }

  async didOpenTextDocument(): Promise<void> {
    this.didChangeTextDocument({
      textDocument: VersionedTextDocumentIdentifier.create(this.rawDocument.uri, this.rawDocument.version),
      contentChanges: [
        {
          range: Range.create(this.rawDocument.positionAt(0), this.rawDocument.positionAt(this.rawDocument.getText().length)),
          text: this.rawDocument.getText(),
        },
      ],
    });
    await this.didSaveTextDocument();
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
      if (this.jinjaParser.hasJinjas(change.text)) {
        return true;
      }
    }

    const jinjas = this.jinjaParser.findAllJinjaRanges(this.rawDocument);

    return jinjas === undefined || (jinjas.length > 0 && this.jinjaParser.isJinjaModified(jinjas, changes));
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

  getDiagnostics(astResult: Result<AnalyzeResponse__Output, string>): Diagnostic[][] {
    const rawDocDiagnostics: Diagnostic[] = [];
    const compiledDocDiagnostics: Diagnostic[] = [];

    if (astResult.isErr()) {
      // Parse string like 'Unrecognized name: paused1; Did you mean paused? [at 9:3]'
      const matchResults = astResult.error.match(/(.*?) \[at (\d+):(\d+)\]/);
      if (matchResults) {
        const [, errorText] = matchResults;
        const lineInCompiledDoc = Number(matchResults[2]) - 1;
        const characterInCompiledDoc = Number(matchResults[3]) - 1;
        const lineInRawDoc = Diff.getOldLineNumber(this.rawDocument.getText(), this.compiledDocument.getText(), lineInCompiledDoc);

        rawDocDiagnostics.push(this.createDiagnostic(this.rawDocument.getText(), lineInRawDoc, characterInCompiledDoc, errorText));
        compiledDocDiagnostics.push(this.createDiagnostic(this.compiledDocument.getText(), lineInCompiledDoc, characterInCompiledDoc, errorText));
      }
    }
    return [rawDocDiagnostics, compiledDocDiagnostics];
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
      registeredCatalogId: this.zetaSqlCatalog.getCatalog().registeredId,

      options: {
        parseLocationRecordType: ParseLocationRecordType.PARSE_LOCATION_RECORD_CODE_SEARCH,

        errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
        languageOptions: this.zetaSqlCatalog.getCatalog().builtinFunctionOptions.languageOptions,
      },
    };

    try {
      const ast = await this.zetaSqlClient.analyze(analyzeRequest);
      console.log('AST was successfully received');
      return ok(ast);
    } catch (e: any) {
      console.log('There was an error wile parsing SQL query');
      return err(e.details ?? 'Unknown parser error [at 0:0]');
    }
  }

  async ensureCatalogInitialized(): Promise<void> {
    await this.schemaTracker.refreshTableNames(this.compiledDocument.getText());
    if (this.schemaTracker.hasNewTables || !this.zetaSqlCatalog.isRegistered()) {
      await this.registerCatalog();
    }
  }

  async registerCatalog(): Promise<void> {
    await this.zetaSqlCatalog.register(this.schemaTracker.tableDefinitions);
    this.schemaTracker.resetHasNewTables();
  }

  onCompilationError(dbtCompilationError: string): void {
    const dbtDiagnostics: Diagnostic[] = [
      {
        severity: DiagnosticSeverity.Error,
        range: Range.create(0, 0, 0, 100),
        message: dbtCompilationError,
      },
    ];

    this.sendUpdateQueryPreview(this.rawDocument.getText(), dbtDiagnostics);
    this.connection.sendDiagnostics({ uri: this.rawDocument.uri, diagnostics: dbtDiagnostics });
  }

  async onCompilationFinished(compiledSql: string): Promise<void> {
    TextDocument.update(this.compiledDocument, [{ text: compiledSql }], this.compiledDocument.version);

    await this.ensureCatalogInitialized();
    const astResult = await this.getAstOrError();
    if (astResult.isOk()) {
      this.ast = astResult.value;
    }

    const [rawDocDiagnostics, compiledDocDiagnostics] = this.getDiagnostics(astResult);
    this.sendUpdateQueryPreview(compiledSql, compiledDocDiagnostics);
    this.connection.sendDiagnostics({ uri: this.rawDocument.uri, diagnostics: rawDocDiagnostics });

    if (!this.modelCompiler.compilationInProgress) {
      this.progressReporter.sendFinish(this.rawDocument.uri);
    }
  }

  sendUpdateQueryPreview(previewText: string, diagnostics: Diagnostic[]): void {
    this.connection.sendNotification('custom/updateQueryPreview', { uri: this.rawDocument.uri, previewText, diagnostics });
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

  onDefinition(definitionParams: DefinitionParams): DefinitionLink[] | undefined {
    const jinjas = this.jinjaParser.findAllEffectiveJinjas(this.rawDocument);
    for (const jinja of jinjas) {
      if (positionInRange(definitionParams.position, jinja.range)) {
        return this.jinjaDefinitionProvider.onJinjaDefinition(this.rawDocument, jinja, definitionParams.position);
      }
    }
    return undefined;
  }

  getTextRangeBeforeBracket(cursorPosition: Position): Range {
    const lines = this.rawDocument.getText().split('\n');
    if (lines.length === 0) {
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
