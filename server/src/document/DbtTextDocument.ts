import { RefReplacement } from 'dbt-language-server-common';
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
  Range,
  SignatureHelp,
  SignatureHelpParams,
  TextDocumentContentChangeEvent,
  TextDocumentItem,
  TextDocumentSaveReason,
  VersionedTextDocumentIdentifier,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { DbtRepository } from '../DbtRepository';
import { DestinationContext } from '../DestinationContext';
import { DiagnosticGenerator } from '../DiagnosticGenerator';
import { HoverProvider } from '../HoverProvider';
import { JinjaParser } from '../JinjaParser';
import { LogLevel } from '../Logger';
import { ModelCompiler } from '../ModelCompiler';
import { ModelProgressReporter } from '../ModelProgressReporter';
import { NotificationSender } from '../NotificationSender';
import { PositionConverter } from '../PositionConverter';
import { ProjectAnalyzeResults } from '../ProjectAnalyzeResults';
import { ProjectChangeListener } from '../ProjectChangeListener';
import { SignatureHelpProvider } from '../SignatureHelpProvider';
import { ZetaSqlAst } from '../ZetaSqlAst';
import { CompletionProvider } from '../completion/CompletionProvider';
import { DbtCli } from '../dbt_execution/DbtCli';
import { DbtCompileJob } from '../dbt_execution/DbtCompileJob';
import { DefinitionProvider } from '../definition/DefinitionProvider';
import { getLineByPosition, getSignatureInfo } from '../utils/TextUtils';
import { areRangesEqual, debounce, getIdentifierRangeAtPosition, getModelPathOrFullyQualifiedName } from '../utils/Utils';
import { DbtDocumentKind } from './DbtDocumentKind';

export class DbtTextDocument {
  static DEBOUNCE_TIMEOUT = 300;

  static readonly ZETA_SQL_AST = new ZetaSqlAst();

  rawDocument: TextDocument;
  compiledDocument: TextDocument;
  requireCompileOnSave: boolean;

  completionProvider: CompletionProvider;

  firstSave = true;

  rawDocDiagnostics: Diagnostic[] = [];
  compiledDocDiagnostics: Diagnostic[] = [];
  refReplacements: RefReplacement[] = [];

  constructor(
    doc: TextDocumentItem,
    private dbtDocumentKind: DbtDocumentKind,
    private notificationSender: NotificationSender,
    private modelProgressReporter: ModelProgressReporter,
    private modelCompiler: ModelCompiler,
    private jinjaParser: JinjaParser,
    private dbtRepository: DbtRepository,
    private dbtCli: DbtCli,
    private destinationContext: DestinationContext,
    private diagnosticGenerator: DiagnosticGenerator,
    private signatureHelpProvider: SignatureHelpProvider,
    private hoverProvider: HoverProvider,
    private definitionProvider: DefinitionProvider,
    private projectChangeListener: ProjectChangeListener,
    private projectAnalyzeResults: ProjectAnalyzeResults,
  ) {
    this.rawDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.compiledDocument = TextDocument.create(doc.uri, doc.languageId, 0, doc.text);
    this.completionProvider = new CompletionProvider(
      this.rawDocument,
      this.compiledDocument,
      this.dbtRepository,
      this.jinjaParser,
      destinationContext,
      projectAnalyzeResults,
    );
    this.requireCompileOnSave = false;

    this.modelCompiler.onCompilationError(this.onCompilationError.bind(this));
    this.modelCompiler.onCompilationFinished(async (compiledSql: string) => {
      projectChangeListener.updateManifest();

      this.updateRefReplacements();
      await this.onCompilationFinished(compiledSql);
    });
    this.modelCompiler.onFinishAllCompilationJobs(this.onFinishAllCompilationTasks.bind(this));

    this.destinationContext.onContextInitialized(this.onContextInitialized.bind(this));
    this.dbtCli.onDbtReady(this.onDbtReady.bind(this));
  }

  updateRefReplacements(): void {
    const refReplacements = [];
    const currentNode = this.dbtRepository.dag.getNodeByUri(this.rawDocument.uri);
    if (currentNode) {
      const { refs } = currentNode.getValue();
      for (const ref of refs) {
        if ('name' in ref) {
          const refNode = this.dbtRepository.dag.getNodeByName(ref.name);
          if (refNode) {
            const { config } = refNode.getValue();
            if (config?.schema) {
              refReplacements.push({
                from: `\`${refNode.getValue().schema}\`.\`${refNode.getValue().name}\``,
                to: `\`${config.schema}\`.\`${refNode.getValue().name}\``,
              });
            }
          }
        }
      }
    }
    this.refReplacements = refReplacements;
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

  async didSaveTextDocument(): Promise<void> {
    if (this.requireCompileOnSave) {
      if (this.dbtCli.dbtReady) {
        this.requireCompileOnSave = false;
        this.debouncedCompile();
      }
    } else if (this.projectChangeListener.currentDbtError) {
      await this.onCompilationError(this.projectChangeListener.currentDbtError.error);
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
      this.updateRawCode(params.contentChanges, params.textDocument.version);
      this.requireCompileOnSave = true;
    } else {
      const compiledContentChanges = params.contentChanges.map<TextDocumentContentChangeEvent>(change => {
        if (!TextDocumentContentChangeEvent.isIncremental(change)) {
          throw new Error('Incremental updates expected');
        }
        const converter = new PositionConverter(this.rawDocument.getText(), this.compiledDocument.getText());

        const start = converter.convertPositionStraight(change.range.start);
        const end = converter.convertPositionStraight(change.range.end);
        let range = undefined;
        try {
          range = Range.create(start, end);
        } catch {
          throw new Error(
            `Invalid state: ${this.rawDocument.getText().length}, ${this.compiledDocument.getText().length}; ${converter.firstLines?.length ?? -1}, ${
              converter.secondLines?.length ?? -1
            }; ${change.range.start.line}, ${change.range.start.character}, ${change.range.end.line}, ${change.range.end.character}; ${start.line}, ${
              start.character
            }, ${end.line}, ${start.character}`,
          );
        }
        return {
          text: change.text,
          range,
        };
      });

      this.updateRawCode(params.contentChanges, params.textDocument.version);
      this.updateCompiledCode(compiledContentChanges, 1);
    }
  }

  updateRawCode(contentChanges: TextDocumentContentChangeEvent[], version: number): void {
    TextDocument.update(this.rawDocument, contentChanges, version);
    this.dbtRepository.setRawCode(this.rawDocument.uri, this.rawDocument.getText());
  }

  updateCompiledCode(contentChanges: TextDocumentContentChangeEvent[], version: number): void {
    TextDocument.update(this.compiledDocument, contentChanges, version);
    this.dbtRepository.setCompiledCode(this.rawDocument.uri, this.compiledDocument.getText());
  }

  async onDbtReady(): Promise<void> {
    await this.didSaveTextDocument();
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

    return (
      jinjas === undefined ||
      (jinjas.length > 0 && (this.jinjaParser.isJinjaModified(jinjas, changes) || this.compiledDocument.getText() === this.rawDocument.getText()))
    );
  }

  forceRecompile(): void {
    if (this.dbtDocumentKind === DbtDocumentKind.MODEL) {
      this.modelProgressReporter.sendStart(this.rawDocument.uri);
      if (this.dbtCli.dbtReady) {
        this.debouncedCompile();
      }
    }
  }

  async resendDiagnostics(): Promise<void> {
    if (this.canResendDiagnostics()) {
      await this.updateDiagnostics();
    }
  }

  canResendDiagnostics(): boolean {
    return (
      this.destinationContext.contextInitialized &&
      this.dbtCli.dbtReady &&
      !this.projectChangeListener.currentDbtError &&
      !this.modelCompiler.compilationInProgress &&
      this.compiledDocument.version !== 0
    );
  }

  debouncedCompile = debounce(async () => {
    this.modelProgressReporter.sendStart(this.rawDocument.uri);
    await this.modelCompiler.compile(this.getModelPathOrFullyQualifiedName(), this.modelIsNotBlank());
  }, DbtTextDocument.DEBOUNCE_TIMEOUT);

  modelIsNotBlank(): boolean {
    return this.rawDocument.getText().trim().length > 0;
  }

  getModelPathOrFullyQualifiedName(): string {
    return getModelPathOrFullyQualifiedName(this.rawDocument.uri, this.dbtRepository.projectPath, this.dbtRepository);
  }

  async onCompilationError(dbtCompilationError: string): Promise<void> {
    console.log(`dbt compilation error: ${dbtCompilationError}`);
    this.updateCompiledCode([{ text: this.rawDocument.getText() }], 1);
    await this.updateAndSendDiagnosticsAndPreview(dbtCompilationError);
  }

  async onCompilationFinished(compiledSql: string): Promise<void> {
    this.updateCompiledCode([{ text: compiledSql }], 1);
    if (this.destinationContext.contextInitialized) {
      await this.updateAndSendDiagnosticsAndPreview();
    }

    if (!this.modelCompiler.compilationInProgress) {
      this.modelProgressReporter.sendFinish(this.rawDocument.uri);
    }
  }

  async onContextInitialized(): Promise<void> {
    if (this.canResendDiagnostics()) {
      await this.updateAndSendDiagnosticsAndPreview();
    }
  }

  async updateAndSendDiagnosticsAndPreview(dbtCompilationError?: string): Promise<void> {
    await this.updateDiagnostics(dbtCompilationError);
    this.notificationSender.sendUpdateQueryPreview(this.rawDocument.uri, this.compiledDocument.getText(), this.refReplacements);
  }

  async updateDiagnostics(dbtCompilationError?: string): Promise<void> {
    this.projectChangeListener.setDbtError(this.rawDocument.uri, dbtCompilationError);

    if (dbtCompilationError) {
      this.rawDocDiagnostics = this.compiledDocDiagnostics = [];
    } else {
      [this.rawDocDiagnostics, this.compiledDocDiagnostics] = await this.createDiagnostics(this.compiledDocument.getText());
      this.sendDiagnostics();
    }
  }

  async createDiagnostics(compiledSql: string): Promise<[Diagnostic[], Diagnostic[]]> {
    let rawDocDiagnostics: Diagnostic[] = [];
    let compiledDocDiagnostics: Diagnostic[] = [];

    if (
      !this.destinationContext.isEmpty() &&
      this.dbtDocumentKind === DbtDocumentKind.MODEL &&
      compiledSql !== '' &&
      compiledSql !== DbtCompileJob.NO_RESULT_FROM_COMPILER
    ) {
      const result = await this.projectChangeListener.analyzeModelTree(this.rawDocument.uri, compiledSql);
      if (result) {
        const { fsPath } = URI.parse(this.rawDocument.uri);

        if (result.analyzeResult.ast.isOk()) {
          this.projectAnalyzeResults.updateModel(result);
          console.log(`AST was successfully received for ${fsPath}`, LogLevel.Debug);
        } else {
          console.log(`There was an error while analyzing ${fsPath}`, LogLevel.Debug);
          console.log(result.analyzeResult.ast, LogLevel.Debug);
        }
        const diagnostics = this.diagnosticGenerator.getDiagnosticsFromAst(result.analyzeResult, this.rawDocument, this.compiledDocument);
        rawDocDiagnostics = diagnostics.raw;
        compiledDocDiagnostics = diagnostics.compiled;
      }
    }

    return [rawDocDiagnostics, compiledDocDiagnostics];
  }

  fixInformationDiagnostic(range: Range): void {
    this.rawDocDiagnostics = this.rawDocDiagnostics.filter(d => !(areRangesEqual(d.range, range) && d.severity === DiagnosticSeverity.Information));
    this.sendDiagnostics();
  }

  sendDiagnostics(): void {
    this.notificationSender.sendDiagnostics(this.rawDocument.uri, this.rawDocDiagnostics, this.compiledDocDiagnostics);
  }

  onFinishAllCompilationTasks(): void {
    this.modelProgressReporter.sendFinish(this.rawDocument.uri);
  }

  onHover(hoverParams: HoverParams): Hover | null {
    const range = getIdentifierRangeAtPosition(hoverParams.position, this.rawDocument.getText());
    const text = this.rawDocument.getText(range);
    return this.hoverProvider.hoverOnText(text, this.rawDocument.uri, this.destinationContext.getDestination());
  }

  async onCompletion(completionParams: CompletionParams): Promise<CompletionItem[]> {
    return this.completionProvider.provideCompletionItems(completionParams);
  }

  onSignatureHelp(params: SignatureHelpParams): SignatureHelp | undefined {
    if (this.destinationContext.getDestination() === 'snowflake') {
      return undefined;
    }
    const lineText = getLineByPosition(this.rawDocument, params.position);
    const signatureInfo = getSignatureInfo(lineText, params.position);
    if (!signatureInfo) {
      return undefined;
    }
    const textBeforeBracket = this.rawDocument.getText(signatureInfo.range);
    return this.signatureHelpProvider.onSignatureHelp(textBeforeBracket, signatureInfo.parameterIndex, params.context?.activeSignatureHelp);
  }

  async onDefinition(definitionParams: DefinitionParams): Promise<DefinitionLink[] | undefined> {
    return this.definitionProvider.onDefinition(definitionParams, this.rawDocument, this.compiledDocument);
  }

  dispose(): void {
    this.notificationSender.clearDiagnostics(this.rawDocument.uri);
  }
}
