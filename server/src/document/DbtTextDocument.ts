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
import { BigQueryContext } from '../bigquery/BigQueryContext';
import { DbtCompletionProvider } from '../completion/DbtCompletionProvider';
import { DbtRepository } from '../DbtRepository';
import { DbtRpcServer } from '../DbtRpcServer';
import { DbtDefinitionProvider } from '../definition/DbtDefinitionProvider';
import { DiagnosticGenerator } from '../DiagnosticGenerator';
import { Diff } from '../Diff';
import { HoverProvider } from '../HoverProvider';
import { JinjaParser, JinjaPartType } from '../JinjaParser';
import { ModelCompiler } from '../ModelCompiler';
import { ProgressReporter } from '../ProgressReporter';
import { SignatureHelpProvider } from '../SignatureHelpProvider';
import { SqlCompletionProvider } from '../SqlCompletionProvider';
import { SqlRefConverter } from '../SqlRefConverter';
import { getTextRangeBeforeBracket } from '../utils/TextUtils';
import { comparePositions, debounce, getFilePathRelatedToWorkspace, getIdentifierRangeAtPosition, positionInRange } from '../utils/Utils';
import { ZetaSqlAst } from '../ZetaSqlAst';
import { DbtDocumentKind } from './DbtDocumentKind';

export class DbtTextDocument {
  static DEBOUNCE_TIMEOUT = 300;

  static readonly ZETA_SQL_AST = new ZetaSqlAst();

  rawDocument: TextDocument;
  compiledDocument: TextDocument;
  requireCompileOnSave: boolean;

  ast?: AnalyzeResponse;
  signatureHelpProvider = new SignatureHelpProvider();
  sqlRefConverter = new SqlRefConverter(this.jinjaParser);
  diagnosticGenerator = new DiagnosticGenerator();
  hoverProvider = new HoverProvider();

  currentDbtError?: string;
  firstSave = true;

  constructor(
    doc: TextDocumentItem,
    private dbtDocumentKind: DbtDocumentKind,
    private workspaceFolder: string,
    private connection: _Connection,
    private progressReporter: ProgressReporter,
    private sqlCompletionProvider: SqlCompletionProvider,
    private dbtCompletionProvider: DbtCompletionProvider,
    private dbtDefinitionProvider: DbtDefinitionProvider,
    private modelCompiler: ModelCompiler,
    private jinjaParser: JinjaParser,
    private onGlobalDbtErrorFixedEmitter: Emitter<void>,
    private dbtRepository: DbtRepository,
    private bigQueryContext?: BigQueryContext,
  ) {
    this.rawDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.compiledDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.requireCompileOnSave = false;

    this.modelCompiler.onCompilationError(this.onCompilationError.bind(this));
    this.modelCompiler.onCompilationFinished(this.onCompilationFinished.bind(this));
    this.modelCompiler.onFinishAllCompilationJobs(this.onFinishAllCompilationTasks.bind(this));
    this.onGlobalDbtErrorFixedEmitter.event(this.onDbtErrorFixed.bind(this));
  }

  willSaveTextDocument(reason: TextDocumentSaveReason): void {
    // Document can be modified and not saved before language server initialized, in this case we need to compile it on first save command call (see unit test).
    if (
      this.firstSave &&
      !this.requireCompileOnSave &&
      reason !== TextDocumentSaveReason.AfterDelay &&
      this.jinjaParser.hasJinjas(this.rawDocument.getText()) &&
      this.dbtDocumentKind === DbtDocumentKind.MODEL
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
    } else if (this.currentDbtError) {
      this.onCompilationError(this.currentDbtError);
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
    if (this.dbtDocumentKind !== DbtDocumentKind.MODEL) {
      return false;
    }

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
    if (this.dbtDocumentKind === DbtDocumentKind.MODEL) {
      this.progressReporter.sendStart(this.rawDocument.uri);
      this.debouncedCompile();
    }
  }

  async refToSql(): Promise<void> {
    const workspaceChange = new WorkspaceChange();
    const textChange = workspaceChange.getTextEditChange(this.rawDocument.uri);

    this.sqlRefConverter.refToSql(this.rawDocument, this.dbtRepository.models).forEach(c => {
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

    this.sqlRefConverter.sqlToRef(this.compiledDocument, resolvedTables, this.dbtRepository.models).forEach(c => {
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
    await this.modelCompiler.compile(this.getModelPathOrFullyQualifiedName());
  }, DbtTextDocument.DEBOUNCE_TIMEOUT);

  getModelPathOrFullyQualifiedName(): string {
    return DbtTextDocument.getModelPathOrFullyQualifiedName(this.rawDocument.uri, this.workspaceFolder, this.dbtRepository);
  }

  static getModelPathOrFullyQualifiedName(docUri: string, workspaceFolder: string, dbtRepository: DbtRepository): string {
    const filePath = getFilePathRelatedToWorkspace(docUri, workspaceFolder);
    if (dbtRepository.packagesInstallPaths.some(p => filePath.startsWith(p))) {
      const startWithPackagesFolder = new RegExp(`^(${dbtRepository.packagesInstallPaths.join('|')}).`);
      return filePath.replaceAll('/', '.').replace(startWithPackagesFolder, '').replace('models.', '').replace(/.sql$/, '');
    }
    return filePath;
  }

  static findCurrentPackage(docUri: string, workspaceFolder: string, dbtRepository: DbtRepository): string | undefined {
    const filePath = getFilePathRelatedToWorkspace(docUri, workspaceFolder);
    if (dbtRepository.packagesInstallPaths.some(p => filePath.startsWith(p))) {
      const withoutPackagesFolder = filePath.replace(new RegExp(`^(${dbtRepository.packagesInstallPaths.join('|')})/`), '');
      return withoutPackagesFolder.substring(0, withoutPackagesFolder.indexOf('/'));
    }
    return dbtRepository.projectName;
  }

  onCompilationError(dbtCompilationError: string): void {
    console.log('dbt compilation error');
    this.currentDbtError = dbtCompilationError;
    TextDocument.update(this.compiledDocument, [{ text: this.rawDocument.getText() }], this.compiledDocument.version);

    const diagnostics = this.diagnosticGenerator.getDbtErrorDiagnostics(
      dbtCompilationError,
      this.getModelPathOrFullyQualifiedName(),
      this.workspaceFolder,
    );

    this.sendUpdateQueryPreview();
    this.sendDiagnostics(diagnostics, diagnostics);
  }

  onDbtErrorFixed(): void {
    if (this.currentDbtError) {
      this.currentDbtError = undefined;
      this.sendDiagnostics([], []);
    }
  }

  async onCompilationFinished(compiledSql: string): Promise<void> {
    if (this.currentDbtError) {
      this.currentDbtError = undefined;
      this.onGlobalDbtErrorFixedEmitter.fire();
    }

    TextDocument.update(this.compiledDocument, [{ text: compiledSql }], this.compiledDocument.version);
    const [rawDocDiagnostics, compiledDocDiagnostics] = await this.createDiagnostics();
    this.sendUpdateQueryPreview();
    this.sendDiagnostics(rawDocDiagnostics, compiledDocDiagnostics);

    if (!this.modelCompiler.compilationInProgress) {
      this.progressReporter.sendFinish(this.rawDocument.uri);
    }
  }

  async createDiagnostics(): Promise<[Diagnostic[], Diagnostic[]]> {
    let rawDocDiagnostics: Diagnostic[] = [];
    let compiledDocDiagnostics: Diagnostic[] = [];

    if (this.bigQueryContext && this.dbtDocumentKind === DbtDocumentKind.MODEL) {
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

    return [rawDocDiagnostics, compiledDocDiagnostics];
  }

  sendUpdateQueryPreview(): void {
    this.connection.sendNotification('custom/updateQueryPreview', { uri: this.rawDocument.uri, previewText: this.compiledDocument.getText() });
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
    return this.hoverProvider.hoverOnText(text, this.ast);
  }

  async onCompletion(completionParams: CompletionParams): Promise<CompletionItem[] | undefined> {
    const dbtCompletionItems = await this.getDbtCompletionItems(completionParams);
    if (dbtCompletionItems) {
      return dbtCompletionItems;
    }
    return this.getSqlCompletions(completionParams);
  }

  async getDbtCompletionItems(completionParams: CompletionParams): Promise<CompletionItem[] | undefined> {
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

  async getSqlCompletions(completionParams: CompletionParams): Promise<CompletionItem[] | undefined> {
    if (!this.bigQueryContext) {
      return undefined;
    }

    const previousPosition = Position.create(
      completionParams.position.line,
      completionParams.position.character > 0 ? completionParams.position.character - 1 : 0,
    );
    const text = this.rawDocument.getText(getIdentifierRangeAtPosition(previousPosition, this.rawDocument.getText()));

    let completionInfo = undefined;
    if (this.ast) {
      const line = Diff.getOldLineNumber(this.compiledDocument.getText(), this.rawDocument.getText(), completionParams.position.line);
      const offset = this.compiledDocument.offsetAt(Position.create(line, completionParams.position.character));
      completionInfo = DbtTextDocument.ZETA_SQL_AST.getCompletionInfo(this.ast, offset);
    }
    return this.sqlCompletionProvider.onSqlCompletion(text, completionParams, this.bigQueryContext.destinationDefinition, completionInfo);
  }

  onSignatureHelp(params: SignatureHelpParams): SignatureHelp | undefined {
    const text = this.rawDocument.getText(getTextRangeBeforeBracket(this.rawDocument.getText(), params.position));
    return this.signatureHelpProvider.onSignatureHelp(text);
  }

  onDefinition(definitionParams: DefinitionParams): DefinitionLink[] | undefined {
    const jinjas = this.jinjaParser.findAllEffectiveJinjas(this.rawDocument);
    for (const jinja of jinjas) {
      if (positionInRange(definitionParams.position, jinja.range)) {
        const jinjaType = this.jinjaParser.getJinjaType(jinja.value);
        const currentPackage = DbtTextDocument.findCurrentPackage(this.rawDocument.uri, this.workspaceFolder, this.dbtRepository);
        return this.dbtDefinitionProvider.provideDefinitions(this.rawDocument, currentPackage, jinja, definitionParams.position, jinjaType);
      }
    }
    return undefined;
  }
}
