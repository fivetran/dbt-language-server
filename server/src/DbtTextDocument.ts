import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import {
  CompletionItem,
  CompletionParams,
  DefinitionLink,
  DefinitionParams,
  Diagnostic,
  DidChangeTextDocumentParams,
  Emitter,
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
import { BigQueryContext } from './bigquery/BigQueryContext';
import { CompletionProvider } from './CompletionProvider';
import { DbtRpcServer } from './DbtRpcServer';
import { JinjaDefinitionProvider } from './definition/JinjaDefinitionProvider';
import { DestinationDefinition } from './DestinationDefinition';
import { DiagnosticGenerator } from './DiagnosticGenerator';
import { Diff } from './Diff';
import { HoverProvider } from './HoverProvider';
import { JinjaParser } from './JinjaParser';
import { ModelCompiler } from './ModelCompiler';
import { ProgressReporter } from './ProgressReporter';
import { SignatureHelpProvider } from './SignatureHelpProvider';
import { SqlRefConverter } from './SqlRefConverter';
import { debounce, getIdentifierRangeAtPosition, getJinjaContentOffset, positionInRange } from './utils/Utils';
import { ZetaSqlAst } from './ZetaSqlAst';

export class DbtTextDocument {
  static DEBOUNCE_TIMEOUT = 300;

  static readonly ZETA_SQL_AST = new ZetaSqlAst();

  rawDocument: TextDocument;
  compiledDocument: TextDocument;
  requireCompileOnSave: boolean;

  bigQueryContext?: BigQueryContext;
  ast?: AnalyzeResponse;
  signatureHelpProvider = new SignatureHelpProvider();
  sqlRefConverter = new SqlRefConverter(this.jinjaParser);
  diagnosticGenerator = new DiagnosticGenerator();

  hasDbtError = false;
  firstSave = true;

  constructor(
    doc: TextDocumentItem,
    private workspaceFolder: string,
    private connection: _Connection,
    private progressReporter: ProgressReporter,
    private completionProvider: CompletionProvider,
    private jinjaDefinitionProvider: JinjaDefinitionProvider,
    private modelCompiler: ModelCompiler,
    private jinjaParser: JinjaParser,
    private onGlobalDbtErrorFixedEmitter: Emitter<void>,
    private onBigQueryContextCreatedEmitter: Emitter<BigQueryContext>,
    bigQueryContext?: BigQueryContext,
  ) {
    this.rawDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.compiledDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.requireCompileOnSave = false;

    this.modelCompiler.onCompilationError(this.onCompilationError.bind(this));
    this.modelCompiler.onCompilationFinished(this.onCompilationFinished.bind(this));
    this.modelCompiler.onFinishAllCompilationJobs(this.onFinishAllCompilationTasks.bind(this));
    this.onGlobalDbtErrorFixedEmitter.event(this.onDbtErrorFixed.bind(this));
    this.onBigQueryContextCreatedEmitter.event(this.onBigQueryContextCreated.bind(this));
    this.bigQueryContext = bigQueryContext;
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

  async didOpenTextDocument(requireCompile: boolean): Promise<void> {
    if (requireCompile) {
      this.requireCompileOnSave = true;
    }
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
    await this.modelCompiler.compile(this.getModelPath());
  }, DbtTextDocument.DEBOUNCE_TIMEOUT);

  getModelPath(): string {
    const index = this.rawDocument.uri.indexOf(this.workspaceFolder);
    return this.rawDocument.uri.slice(index + this.workspaceFolder.length + 1);
  }

  onCompilationError(dbtCompilationError: string): void {
    this.hasDbtError = true;
    const diagnostics = this.diagnosticGenerator.getDbtErrorDiagnostics(dbtCompilationError, this.getModelPath(), this.workspaceFolder);

    this.sendUpdateQueryPreview(this.rawDocument.getText());
    this.sendDiagnostics(diagnostics, diagnostics);
  }

  onDbtErrorFixed(): void {
    if (this.hasDbtError) {
      this.hasDbtError = false;
      this.sendDiagnostics([], []);
    }
  }

  onBigQueryContextCreated(context: BigQueryContext): void {
    this.bigQueryContext = context;
    void this.createDiagnostics();
  }

  async onCompilationFinished(compiledSql: string): Promise<void> {
    if (this.hasDbtError) {
      this.hasDbtError = false;
      this.onGlobalDbtErrorFixedEmitter.fire();
    }

    TextDocument.update(this.compiledDocument, [{ text: compiledSql }], this.compiledDocument.version);
    this.sendUpdateQueryPreview(compiledSql);
    await this.createDiagnostics();

    if (!this.modelCompiler.compilationInProgress) {
      this.progressReporter.sendFinish(this.rawDocument.uri);
    }
  }

  async createDiagnostics(): Promise<void> {
    let rawDocDiagnostics: Diagnostic[] = [];
    let compiledDocDiagnostics: Diagnostic[] = [];

    if (this.bigQueryContext) {
      await this.bigQueryContext.ensureCatalogInitialized(this.compiledDocument);
      const astResult = await this.bigQueryContext.getAstOrError(this.compiledDocument);
      if (astResult.isOk()) {
        this.ast = astResult.value;
      }
      [rawDocDiagnostics, compiledDocDiagnostics] = this.diagnosticGenerator.getDiagnosticsFromAst(
        astResult,
        this.rawDocument.getText(),
        this.compiledDocument.getText(),
      );
    }

    this.sendDiagnostics(rawDocDiagnostics, compiledDocDiagnostics);
  }

  sendUpdateQueryPreview(previewText: string): void {
    this.connection.sendNotification('custom/updateQueryPreview', { uri: this.rawDocument.uri, previewText });
  }

  sendDiagnostics(rawDocDiagnostics: Diagnostic[], compiledDocDiagnostics: Diagnostic[]): void {
    this.connection.sendDiagnostics({ uri: this.rawDocument.uri, diagnostics: rawDocDiagnostics });
    this.connection.sendNotification('custom/updateQueryPreviewDiagnostics', { uri: this.rawDocument.uri, diagnostics: compiledDocDiagnostics });
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
