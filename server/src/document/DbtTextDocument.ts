import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
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
  Position,
  Range,
  SignatureHelp,
  SignatureHelpParams,
  TextDocumentContentChangeEvent,
  TextDocumentItem,
  TextDocumentSaveReason,
  VersionedTextDocumentIdentifier,
  _Connection,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtCompletionProvider } from '../completion/DbtCompletionProvider';
import { DbtContext } from '../DbtContext';
import { DbtDestinationContext } from '../DbtDestinationContext';
import { DbtRepository } from '../DbtRepository';
import { DbtDefinitionProvider } from '../definition/DbtDefinitionProvider';
import { DiagnosticGenerator } from '../DiagnosticGenerator';
import { HoverProvider } from '../HoverProvider';
import { JinjaParser, JinjaPartType } from '../JinjaParser';
import { ModelCompiler } from '../ModelCompiler';
import { PositionConverter } from '../PositionConverter';
import { ProgressReporter } from '../ProgressReporter';
import { SignatureHelpProvider } from '../SignatureHelpProvider';
import { SqlCompletionProvider } from '../SqlCompletionProvider';
import { DiffUtils } from '../utils/DiffUtils';
import path = require('path');

import { getTextRangeBeforeBracket } from '../utils/TextUtils';
import {
  areRangesEqual,
  comparePositions,
  debounce,
  getFilePathRelatedToWorkspace,
  getIdentifierRangeAtPosition,
  positionInRange,
} from '../utils/Utils';
import { ZetaSqlAst } from '../ZetaSqlAst';
import { DbtDocumentKind } from './DbtDocumentKind';

export class DbtTextDocument {
  static DEBOUNCE_TIMEOUT = 300;

  static readonly ZETA_SQL_AST = new ZetaSqlAst();

  rawDocument: TextDocument;
  compiledDocument: TextDocument;
  requireCompileOnSave: boolean;

  requireDiagnosticsUpdate = false;

  ast?: AnalyzeResponse;
  signatureHelpProvider = new SignatureHelpProvider();
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
    private connection: _Connection,
    private progressReporter: ProgressReporter,
    private sqlCompletionProvider: SqlCompletionProvider,
    private dbtCompletionProvider: DbtCompletionProvider,
    private dbtDefinitionProvider: DbtDefinitionProvider,
    private modelCompiler: ModelCompiler,
    private jinjaParser: JinjaParser,
    private onGlobalDbtErrorFixedEmitter: Emitter<void>,
    private dbtRepository: DbtRepository,
    private dbtContext: DbtContext,
    private dbtDestinationContext: DbtDestinationContext,
  ) {
    this.rawDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.compiledDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.diagnosticGenerator = new DiagnosticGenerator(this.dbtRepository);
    this.requireCompileOnSave = false;

    this.modelCompiler.onCompilationError(this.onCompilationError.bind(this));
    this.modelCompiler.onCompilationFinished(this.onCompilationFinished.bind(this));
    this.modelCompiler.onFinishAllCompilationJobs(this.onFinishAllCompilationTasks.bind(this));
    this.onGlobalDbtErrorFixedEmitter.event(this.onDbtErrorFixed.bind(this));

    if (!this.dbtDestinationContext.contextInitialized) {
      this.dbtDestinationContext.onContextInitializedEmitter.event(this.onContextInitialized.bind(this));
    }
    if (!this.dbtContext.dbtReady) {
      this.dbtContext.onDbtReadyEmitter.event(this.onDbtReady.bind(this));
    }
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
      if (this.dbtContext.dbtReady) {
        this.requireCompileOnSave = false;
        if (refresh) {
          this.dbtContext.refresh();
        }
        this.debouncedCompile();
      }
    } else if (this.currentDbtError) {
      this.onCompilationError(this.currentDbtError);
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

        return {
          text: change.text,
          range: Range.create(converter.convertPositionStraight(change.range.start), converter.convertPositionStraight(change.range.end)),
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

    return jinjas === undefined || (jinjas.length > 0 && this.jinjaParser.isJinjaModified(jinjas, changes));
  }

  forceRecompile(): void {
    if (this.dbtDocumentKind === DbtDocumentKind.MODEL) {
      this.progressReporter.sendStart(this.rawDocument.uri);
      if (this.dbtContext.dbtReady) {
        this.debouncedCompile();
      }
    }
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
      return filePath.replaceAll(path.sep, '.').replace(startWithPackagesFolder, '').replace('models.', '').replace(/.sql$/, '');
    }
    return filePath;
  }

  onCompilationError(dbtCompilationError: string): void {
    console.log(`dbt compilation error: ${dbtCompilationError}`);
    this.currentDbtError = dbtCompilationError;
    TextDocument.update(this.compiledDocument, [{ text: this.rawDocument.getText() }], this.compiledDocument.version);

    const diagnostics = this.diagnosticGenerator.getDbtErrorDiagnostics(
      dbtCompilationError,
      this.getModelPathOrFullyQualifiedName(),
      this.workspaceFolder,
    );
    this.rawDocDiagnostics = diagnostics;
    this.compiledDocDiagnostics = diagnostics;

    this.sendUpdateQueryPreview();

    this.sendDiagnostics();
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
    if (this.dbtDestinationContext.contextInitialized) {
      await this.updateDiagnostics(compiledSql);
      this.sendUpdateQueryPreview();
    } else {
      this.requireDiagnosticsUpdate = true;
    }

    if (!this.modelCompiler.compilationInProgress) {
      this.progressReporter.sendFinish(this.rawDocument.uri);
    }
  }

  async onContextInitialized(): Promise<void> {
    if (this.requireDiagnosticsUpdate && this.dbtContext.dbtReady) {
      this.requireDiagnosticsUpdate = false;
      await this.updateDiagnostics();
      this.sendUpdateQueryPreview();
    }
  }

  async updateDiagnostics(compiledSql?: string): Promise<void> {
    [this.rawDocDiagnostics, this.compiledDocDiagnostics] = await this.createDiagnostics(compiledSql ?? this.compiledDocument.getText());
    this.sendDiagnostics();
  }

  async createDiagnostics(compiledSql: string): Promise<[Diagnostic[], Diagnostic[]]> {
    let rawDocDiagnostics: Diagnostic[] = [];
    let compiledDocDiagnostics: Diagnostic[] = [];

    if (this.dbtDestinationContext.bigQueryContext && this.dbtDocumentKind === DbtDocumentKind.MODEL) {
      const originalFilePath = this.rawDocument.uri.substring(
        this.rawDocument.uri.lastIndexOf(this.workspaceFolder) + this.workspaceFolder.length + 1,
      );
      const astResult = await this.dbtDestinationContext.bigQueryContext.analyzeTable(originalFilePath, compiledSql);
      if (astResult.isOk()) {
        console.log(`AST was successfully received for ${originalFilePath}`);
        this.ast = astResult.value;
      } else {
        console.log(`There was an error while parsing ${originalFilePath}`);
        console.log(astResult);
      }
      [rawDocDiagnostics, compiledDocDiagnostics] = this.diagnosticGenerator.getDiagnosticsFromAst(
        astResult,
        this.rawDocument,
        this.compiledDocument,
      );
    }

    return [rawDocDiagnostics, compiledDocDiagnostics];
  }

  sendUpdateQueryPreview(): void {
    this.connection
      .sendNotification('custom/updateQueryPreview', { uri: this.rawDocument.uri, previewText: this.compiledDocument.getText() })
      .catch(e => console.log(`Failed to send notification: ${e instanceof Error ? e.message : String(e)}`));
  }

  fixInformationDiagnostic(range: Range): void {
    this.rawDocDiagnostics = this.rawDocDiagnostics.filter(d => !(areRangesEqual(d.range, range) && d.severity === DiagnosticSeverity.Information));
    this.sendDiagnostics();
  }

  sendDiagnostics(): void {
    this.connection
      .sendDiagnostics({ uri: this.rawDocument.uri, diagnostics: this.rawDocDiagnostics })
      .catch(e => console.log(`Failed to send diagnostics: ${e instanceof Error ? e.message : String(e)}`));
    this.connection
      .sendNotification('custom/updateQueryPreviewDiagnostics', { uri: this.rawDocument.uri, diagnostics: this.compiledDocDiagnostics })
      .catch(e => console.log(`Failed to send notification: ${e instanceof Error ? e.message : String(e)}`));
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
    const dbtCompletionItems = this.getDbtCompletionItems(completionParams);
    if (dbtCompletionItems) {
      return dbtCompletionItems;
    }
    return this.getSqlCompletions(completionParams);
  }

  getDbtCompletionItems(completionParams: CompletionParams): CompletionItem[] | undefined {
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
    if (!this.dbtDestinationContext.contextInitialized || !this.dbtDestinationContext.bigQueryContext) {
      return undefined;
    }

    const previousPosition = Position.create(
      completionParams.position.line,
      completionParams.position.character > 0 ? completionParams.position.character - 1 : 0,
    );
    const text = this.rawDocument.getText(getIdentifierRangeAtPosition(previousPosition, this.rawDocument.getText()));

    let completionInfo = undefined;
    if (this.ast) {
      const line = DiffUtils.getOldLineNumber(this.compiledDocument.getText(), this.rawDocument.getText(), completionParams.position.line);
      const offset = this.compiledDocument.offsetAt(Position.create(line, completionParams.position.character));
      completionInfo = DbtTextDocument.ZETA_SQL_AST.getCompletionInfo(this.ast, offset);
    }
    return this.sqlCompletionProvider.onSqlCompletion(
      text,
      completionParams,
      this.dbtDestinationContext.bigQueryContext.destinationDefinition,
      completionInfo,
    );
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
        return this.dbtDefinitionProvider.provideDefinitions(this.rawDocument, jinja, definitionParams.position, jinjaType);
      }
    }
    return undefined;
  }

  clearDiagnostics(): void {
    this.connection
      .sendDiagnostics({ uri: this.rawDocument.uri, diagnostics: [] })
      .catch(e => console.log(`Failed to send diagnostics while closing document: ${e instanceof Error ? e.message : String(e)}`));
  }

  dispose(): void {
    const { uri } = this.rawDocument;
    const fileName = uri.substring(uri.lastIndexOf(path.sep));

    if (this.currentDbtError?.includes(fileName)) {
      this.fixGlobalDbtError();
    }

    this.clearDiagnostics();
  }
}
