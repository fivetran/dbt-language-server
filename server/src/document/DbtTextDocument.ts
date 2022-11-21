import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import * as path from 'node:path';
import {
  CompletionItem,
  CompletionParams,
  DefinitionLink,
  DefinitionParams,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeTextDocumentParams,
  Emitter,
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
import { CompletionProvider } from '../completion/CompletionProvider';
import { DbtRepository } from '../DbtRepository';
import { Dbt } from '../dbt_execution/Dbt';
import { DbtCompileJob } from '../dbt_execution/DbtCompileJob';
import { DbtDefinitionProvider } from '../definition/DbtDefinitionProvider';
import { DestinationState } from '../DestinationState';
import { DiagnosticGenerator } from '../DiagnosticGenerator';
import { HoverProvider } from '../HoverProvider';
import { JinjaParser } from '../JinjaParser';
import { LogLevel } from '../Logger';
import { ModelCompiler } from '../ModelCompiler';
import { NotificationSender } from '../NotificationSender';
import { PositionConverter } from '../PositionConverter';
import { ProgressReporter } from '../ProgressReporter';
import { SignatureHelpProvider } from '../SignatureHelpProvider';
import { getLineByPosition, getSignatureInfo } from '../utils/TextUtils';
import { areRangesEqual, debounce, getFilePathRelatedToWorkspace, getIdentifierRangeAtPosition, positionInRange } from '../utils/Utils';
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
  completionProvider: CompletionProvider;
  dbtDefinitionProvider: DbtDefinitionProvider;

  diagnosticGenerator: DiagnosticGenerator;
  hoverProvider = new HoverProvider();

  currentDbtError?: string;
  firstSave = true;

  rawDocDiagnostics: Diagnostic[] = [];
  compiledDocDiagnostics: Diagnostic[] = [];

  constructor(
    doc: TextDocumentItem,
    private dbtDocumentKind: DbtDocumentKind,
    private workspaceFolder: string,
    private notificationSender: NotificationSender,
    private progressReporter: ProgressReporter,
    private modelCompiler: ModelCompiler,
    private jinjaParser: JinjaParser,
    private onGlobalDbtErrorFixedEmitter: Emitter<void>,
    private dbtRepository: DbtRepository,
    private dbt: Dbt,
    private destinationState: DestinationState,
  ) {
    this.rawDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.compiledDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.diagnosticGenerator = new DiagnosticGenerator(this.dbtRepository);
    this.completionProvider = new CompletionProvider(this.rawDocument, this.compiledDocument, this.dbtRepository, this.jinjaParser, destinationState);
    this.dbtDefinitionProvider = new DbtDefinitionProvider(this.dbtRepository);
    this.requireCompileOnSave = false;

    this.modelCompiler.onCompilationError(this.onCompilationError.bind(this));
    this.modelCompiler.onCompilationFinished(this.onCompilationFinished.bind(this));
    this.modelCompiler.onFinishAllCompilationJobs(this.onFinishAllCompilationTasks.bind(this));
    this.onGlobalDbtErrorFixedEmitter.event(this.onDbtErrorFixed.bind(this));

    this.destinationState.onContextInitialized(this.onContextInitialized.bind(this));
    this.dbt.onDbtReady(this.onDbtReady.bind(this));
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

  async didSaveTextDocument(refresh: boolean): Promise<void> {
    if (this.requireCompileOnSave) {
      if (this.dbt.dbtReady) {
        this.requireCompileOnSave = false;
        if (refresh) {
          this.dbt.refresh();
        }
        this.debouncedCompile();
      }
    } else if (this.currentDbtError) {
      await this.onCompilationError(this.currentDbtError);
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
    await this.didSaveTextDocument(false);
  }

  didChangeTextDocument(params: DidChangeTextDocumentParams): void {
    if (this.requireCompileOnSave || this.isDbtCompileNeeded(params.contentChanges)) {
      TextDocument.update(this.rawDocument, params.contentChanges, params.textDocument.version);
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

      TextDocument.update(this.rawDocument, params.contentChanges, params.textDocument.version);
      TextDocument.update(this.compiledDocument, compiledContentChanges, params.textDocument.version);
    }
  }

  async onDbtReady(): Promise<void> {
    await this.didSaveTextDocument(true);
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
      this.progressReporter.sendStart(this.rawDocument.uri);
      if (this.dbt.dbtReady) {
        this.debouncedCompile();
      }
    }
  }

  async resendDiagnostics(): Promise<void> {
    if (
      this.destinationState.contextInitialized &&
      this.dbt.dbtReady &&
      !this.currentDbtError &&
      !this.modelCompiler.compilationInProgress &&
      this.compiledDocument.getText() !== this.rawDocument.getText()
    ) {
      await this.updateDiagnostics();
    }
  }

  debouncedCompile = debounce(async () => {
    this.progressReporter.sendStart(this.rawDocument.uri);
    await this.modelCompiler.compile(this.getModelPathOrFullyQualifiedName(), this.modelIsNotBlank());
  }, DbtTextDocument.DEBOUNCE_TIMEOUT);

  modelIsNotBlank(): boolean {
    return this.rawDocument.getText().trim().length > 0;
  }

  getModelPathOrFullyQualifiedName(): string {
    return DbtTextDocument.getModelPathOrFullyQualifiedName(this.rawDocument.uri, this.workspaceFolder, this.dbtRepository);
  }

  static getModelPathOrFullyQualifiedName(docUri: string, workspaceFolder: string, dbtRepository: DbtRepository): string {
    const filePath = getFilePathRelatedToWorkspace(docUri, workspaceFolder);
    if (dbtRepository.packagesInstallPaths.some(p => filePath.startsWith(p))) {
      const startWithPackagesFolder = new RegExp(`^(${dbtRepository.packagesInstallPaths.join('|')}).`);
      return filePath.replaceAll(path.sep, '.').replace(startWithPackagesFolder, '').replace('models.', '').replace(/.sql$/, '');
    }
    return filePath;
  }

  async onCompilationError(dbtCompilationError: string): Promise<void> {
    console.log(`dbt compilation error: ${dbtCompilationError}`);
    this.currentDbtError = dbtCompilationError;
    TextDocument.update(this.compiledDocument, [{ text: this.rawDocument.getText() }], this.compiledDocument.version);

    await this.updateAndSendDiagnosticsAndPreview(dbtCompilationError);
  }

  onDbtErrorFixed(): void {
    if (this.currentDbtError) {
      this.currentDbtError = undefined;
      this.rawDocDiagnostics = [];
      this.compiledDocDiagnostics = [];
      this.sendDiagnostics();
      this.requireCompileOnSave = true;
    }
  }

  fixGlobalDbtError(): void {
    if (this.currentDbtError) {
      this.currentDbtError = undefined;
      this.onGlobalDbtErrorFixedEmitter.fire();
    }
  }

  async onCompilationFinished(compiledSql: string): Promise<void> {
    this.fixGlobalDbtError();

    TextDocument.update(this.compiledDocument, [{ text: compiledSql }], this.compiledDocument.version);
    if (this.destinationState.contextInitialized) {
      await this.updateAndSendDiagnosticsAndPreview();
    }

    if (!this.modelCompiler.compilationInProgress) {
      this.progressReporter.sendFinish(this.rawDocument.uri);
    }
  }

  async onContextInitialized(): Promise<void> {
    if (this.dbt.dbtReady) {
      await this.updateAndSendDiagnosticsAndPreview();
    }
  }

  async updateAndSendDiagnosticsAndPreview(dbtCompilationError?: string): Promise<void> {
    await this.updateDiagnostics(dbtCompilationError);
    this.notificationSender.sendUpdateQueryPreview(this.rawDocument.uri, this.compiledDocument.getText());
  }

  async updateDiagnostics(dbtCompilationError?: string): Promise<void> {
    if (dbtCompilationError) {
      const diagnosticsInfo = this.diagnosticGenerator.getDbtErrorDiagnostics(
        dbtCompilationError,
        this.getModelPathOrFullyQualifiedName(),
        this.workspaceFolder,
      );
      const otherFileUri = diagnosticsInfo[1];
      this.rawDocDiagnostics = this.compiledDocDiagnostics = otherFileUri === undefined ? diagnosticsInfo[0] : [];
      if (otherFileUri !== undefined) {
        const diagnostics = diagnosticsInfo[0];
        this.notificationSender.sendDiagnostics(otherFileUri, diagnostics, diagnostics);
      }
    } else {
      [this.rawDocDiagnostics, this.compiledDocDiagnostics] = await this.createDiagnostics(this.compiledDocument.getText());
    }

    this.sendDiagnostics();
  }

  async createDiagnostics(compiledSql: string): Promise<[Diagnostic[], Diagnostic[]]> {
    let rawDocDiagnostics: Diagnostic[] = [];
    let compiledDocDiagnostics: Diagnostic[] = [];

    if (
      this.destinationState.bigQueryContext &&
      this.dbtDocumentKind === DbtDocumentKind.MODEL &&
      compiledSql !== '' &&
      compiledSql !== DbtCompileJob.NO_RESULT_FROM_COMPILER
    ) {
      const { fsPath } = URI.parse(this.rawDocument.uri);
      const originalFilePath = fsPath.slice(fsPath.lastIndexOf(this.workspaceFolder) + this.workspaceFolder.length + 1);
      const astResult = await this.destinationState.bigQueryContext.analyzeTable(originalFilePath, compiledSql);
      if (astResult.isOk()) {
        console.log(`AST was successfully received for ${originalFilePath}`, LogLevel.Debug);
        this.ast = astResult.value;
      } else {
        console.log(`There was an error while parsing ${originalFilePath}`, LogLevel.Debug);
        console.log(astResult, LogLevel.Debug);
      }
      [rawDocDiagnostics, compiledDocDiagnostics] = this.diagnosticGenerator.getDiagnosticsFromAst(
        astResult,
        this.rawDocument,
        this.compiledDocument,
      );
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
    this.progressReporter.sendFinish(this.rawDocument.uri);
  }

  onHover(hoverParams: HoverParams): Hover | null {
    const range = getIdentifierRangeAtPosition(hoverParams.position, this.rawDocument.getText());
    const text = this.rawDocument.getText(range);
    return this.hoverProvider.hoverOnText(text, this.ast);
  }

  async onCompletion(completionParams: CompletionParams): Promise<CompletionItem[]> {
    return this.completionProvider.provideCompletionItems(completionParams, this.ast);
  }

  onSignatureHelp(params: SignatureHelpParams): SignatureHelp | undefined {
    const lineText = getLineByPosition(this.rawDocument, params.position);
    const signatureInfo = getSignatureInfo(lineText, params.position);
    if (!signatureInfo) {
      return undefined;
    }
    const textBeforeBracket = this.rawDocument.getText(signatureInfo.range);
    console.log(
      `onSignatureHelp(line='${params.position.line}', character='${params.position.character}', text='${textBeforeBracket}', parameterIndex='${signatureInfo.parameterIndex}')`,
      LogLevel.Debug,
    );
    return this.signatureHelpProvider.onSignatureHelp(textBeforeBracket, signatureInfo.parameterIndex, params.context?.activeSignatureHelp);
  }

  onDefinition(definitionParams: DefinitionParams): DefinitionLink[] | undefined {
    const jinjas = this.jinjaParser.findAllEffectiveJinjas(this.rawDocument);
    for (const jinja of jinjas) {
      if (positionInRange(definitionParams.position, jinja.range)) {
        const jinjaType = this.jinjaParser.getJinjaType(jinja.value);
        return this.dbtDefinitionProvider.provideDefinitions(this.rawDocument, jinja, definitionParams.position, jinjaType);
      }
    }
    return undefined;
  }

  dispose(): void {
    const { uri } = this.rawDocument;
    const fileName = uri.slice(uri.lastIndexOf(path.sep));

    if (this.currentDbtError?.includes(fileName)) {
      this.fixGlobalDbtError();
    }

    this.notificationSender.clearDiagnostics(this.rawDocument.uri);
  }
}
