import { randomUUID } from 'crypto';
import { CustomInitParams, DbtCompilerType } from 'dbt-language-server-common';
import { Result } from 'neverthrow';
import { homedir } from 'os';
import { performance } from 'perf_hooks';
import {
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  Command,
  CompletionItem,
  CompletionParams,
  CreateFilesParams,
  DefinitionLink,
  DefinitionParams,
  DeleteFilesParams,
  DidChangeConfigurationNotification,
  DidChangeTextDocumentParams,
  DidChangeWatchedFilesParams,
  DidCloseTextDocumentParams,
  DidCreateFilesNotification,
  DidDeleteFilesNotification,
  DidOpenTextDocumentParams,
  DidRenameFilesNotification,
  DidSaveTextDocumentParams,
  Emitter,
  ExecuteCommandParams,
  Hover,
  HoverParams,
  InitializeError,
  InitializeParams,
  InitializeResult,
  Range,
  RenameFilesParams,
  ResponseError,
  SignatureHelp,
  SignatureHelpParams,
  TextDocumentSyncKind,
  TextEdit,
  WillSaveTextDocumentParams,
  _Connection,
} from 'vscode-languageserver';
import { FileOperationFilter } from 'vscode-languageserver-protocol/lib/common/protocol.fileOperations';
import { DbtCompletionProvider } from './completion/DbtCompletionProvider';
import { DbtContext } from './DbtContext';
import { DbtProfileCreator, DbtProfileInfo } from './DbtProfileCreator';
import { DbtProject } from './DbtProject';
import { DbtRepository } from './DbtRepository';
import { getStringVersion } from './DbtVersion';
import { Dbt, DbtMode } from './dbt_execution/Dbt';
import { DbtCli } from './dbt_execution/DbtCli';
import { DbtRpc } from './dbt_execution/DbtRpc';
import { DbtDefinitionProvider } from './definition/DbtDefinitionProvider';
import { DestinationState } from './DestinationState';
import { DbtDocumentKind } from './document/DbtDocumentKind';
import { DbtDocumentKindResolver } from './document/DbtDocumentKindResolver';
import { DbtTextDocument } from './document/DbtTextDocument';
import { FeatureFinder } from './FeatureFinder';
import { FileChangeListener } from './FileChangeListener';
import { JinjaParser } from './JinjaParser';
import { Logger } from './Logger';
import { ManifestParser } from './manifest/ManifestParser';
import { ModelCompiler } from './ModelCompiler';
import { NotificationSender } from './NotificationSender';
import { ProgressReporter } from './ProgressReporter';
import { SqlCompletionProvider } from './SqlCompletionProvider';
import path = require('path');

export class LspServer {
  static OPEN_CLOSE_DEBOUNCE_PERIOD = 1000;

  sqlToRefCommandName = randomUUID();
  filesFilter: FileOperationFilter[];
  workspaceFolder: string;
  hasConfigurationCapability = false;
  featureFinder?: FeatureFinder;
  openedDocuments = new Map<string, DbtTextDocument>();
  progressReporter: ProgressReporter;
  notificationSender: NotificationSender;
  fileChangeListener: FileChangeListener;
  sqlCompletionProvider: SqlCompletionProvider;
  dbtCompletionProvider: DbtCompletionProvider;
  dbtDefinitionProvider: DbtDefinitionProvider;
  dbtProfileCreator: DbtProfileCreator;
  manifestParser = new ManifestParser();
  dbtRepository = new DbtRepository();
  dbtDocumentKindResolver = new DbtDocumentKindResolver(this.dbtRepository);
  initStart = performance.now();
  onGlobalDbtErrorFixedEmitter = new Emitter<void>();

  destinationState = new DestinationState();
  dbtContext = new DbtContext();

  openTextDocumentRequests = new Map<string, DidOpenTextDocumentParams>();

  constructor(private connection: _Connection) {
    this.workspaceFolder = process.cwd();
    this.filesFilter = [{ scheme: 'file', pattern: { glob: `${this.workspaceFolder}/**/*`, matches: 'file' } }];
    Logger.prepareLogger(this.workspaceFolder);
    const dbtProject = new DbtProject('.');

    this.progressReporter = new ProgressReporter(this.connection);
    this.notificationSender = new NotificationSender(this.connection);
    this.dbtProfileCreator = new DbtProfileCreator(dbtProject, path.join(homedir(), '.dbt', 'profiles.yml'));
    this.fileChangeListener = new FileChangeListener(this.workspaceFolder, dbtProject, this.manifestParser, this.dbtRepository);
    this.sqlCompletionProvider = new SqlCompletionProvider();
    this.dbtCompletionProvider = new DbtCompletionProvider(this.dbtRepository);
    this.dbtDefinitionProvider = new DbtDefinitionProvider(this.dbtRepository);
  }

  onInitialize(params: InitializeParams): InitializeResult<unknown> | ResponseError<InitializeError> {
    console.log(`Starting server for folder ${this.workspaceFolder}.`);

    process.on('uncaughtException', this.onUncaughtException.bind(this));
    process.on('SIGTERM', () => this.onShutdown());
    process.on('SIGINT', () => this.onShutdown());

    this.fileChangeListener.onInit();

    this.initializeNotifications();

    const customInitParams = params.initializationOptions as CustomInitParams;
    this.featureFinder = new FeatureFinder(customInitParams.pythonInfo);
    this.dbtContext.dbt = this.createDbt(this.featureFinder, customInitParams.dbtCompiler);

    const { capabilities } = params;
    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    this.hasConfigurationCapability = Boolean(capabilities.workspace?.configuration);

    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Incremental,
          willSave: true,
          save: true,
        },
        hoverProvider: true,
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: ['.', '(', '"', "'"],
        },
        signatureHelpProvider: {
          triggerCharacters: ['('],
        },
        definitionProvider: true,
        codeActionProvider: true,
        executeCommandProvider: {
          commands: [this.sqlToRefCommandName],
        },
        workspace: {
          fileOperations: {
            didRename: {
              filters: this.filesFilter,
            },
          },
        },
      },
    };
  }

  createDbt(featureFinder: FeatureFinder, dbtCompiler: DbtCompilerType): Dbt {
    const dbtMode = this.getDbtMode(featureFinder, dbtCompiler);
    console.log(`ModelCompiler mode: ${DbtMode[dbtMode]}.`);

    return dbtMode === DbtMode.DBT_RPC
      ? new DbtRpc(featureFinder, this.connection, this.progressReporter, this.fileChangeListener)
      : new DbtCli(featureFinder, this.connection, this.progressReporter);
  }

  getDbtMode(featureFinder: FeatureFinder, dbtCompiler: DbtCompilerType): DbtMode {
    switch (dbtCompiler) {
      case 'Auto': {
        if (process.platform === 'win32') {
          return DbtMode.CLI;
        }
        const pythonVersion = featureFinder.getPythonVersion();
        // https://github.com/dbt-labs/dbt-rpc/issues/85
        if (pythonVersion !== undefined && pythonVersion[0] >= 3 && pythonVersion[1] >= 10) {
          return DbtMode.CLI;
        }
        return process.env['USE_DBT_CLI'] === 'true' ? DbtMode.CLI : DbtMode.DBT_RPC;
      }
      case 'dbt-rpc': {
        return DbtMode.DBT_RPC;
      }
      case 'dbt': {
        return DbtMode.CLI;
      }
      default: {
        return DbtMode.DBT_RPC;
      }
    }
  }

  onUncaughtException(error: Error, _origin: 'uncaughtException' | 'unhandledRejection'): void {
    console.log(error.stack);

    this.notificationSender.sendTelemetry('error', {
      name: error.name,
      message: error.message,
      stack: error.stack ?? '',
    });

    process.exit(1);
  }

  initializeNotifications(): void {
    this.connection.onNotification('custom/dbtCompile', this.onDbtCompile.bind(this));
  }

  async onInitialized(): Promise<void> {
    this.registerClientNotification();

    const profileResult = this.dbtProfileCreator.createDbtProfile();
    const contextInfo = profileResult.match<DbtProfileInfo>(
      s => s,
      e => e,
    );
    const dbtProfileType = profileResult.isOk() ? profileResult.value.type : profileResult.error.type;

    if (profileResult.isErr()) {
      this.showProfileCreationWarning(profileResult.error.message);
    }

    const prepareDestination = profileResult.isErr()
      ? this.destinationState.prepareDestinationStub()
      : this.destinationState.prepareBigQueryDestination(profileResult.value, this.dbtRepository).then((prepareResult: Result<void, string>) => {
          // eslint-disable-next-line promise/always-return
          if (prepareResult.isErr()) {
            this.showCreateContextWarning(prepareResult.error);
          }
        });
    const prepareDbt = this.dbtContext.prepare(dbtProfileType);

    this.dbtRepository.manifestParsedDeferred.promise
      // eslint-disable-next-line promise/always-return
      .then(() => {
        this.notificationSender.logLanguageServerManifestParsed();
      })
      .catch(e => console.log(`Manifest was not parsed: ${e instanceof Error ? e.message : String(e)}`));

    await Promise.allSettled([prepareDbt, prepareDestination]);
    const initTime = performance.now() - this.initStart;
    this.logStartupInfo(contextInfo, initTime);
  }

  registerClientNotification(): void {
    if (this.hasConfigurationCapability) {
      this.connection.client
        .register(DidChangeConfigurationNotification.type, undefined)
        .catch(e => console.log(`Error while registering DidChangeConfiguration notification: ${e instanceof Error ? e.message : String(e)}`));
    }

    const filters = this.filesFilter;
    this.connection.client
      .register(DidCreateFilesNotification.type, { filters })
      .catch(e => console.log(`Error while registering DidCreateFiles notification: ${e instanceof Error ? e.message : String(e)}`));

    this.connection.client
      .register(DidRenameFilesNotification.type, { filters })
      .catch(e => console.log(`Error while registering DidRenameFiles notification: ${e instanceof Error ? e.message : String(e)}`));

    this.connection.client
      .register(DidDeleteFilesNotification.type, { filters })
      .catch(e => console.log(`Error while registering DidDeleteFiles notification: ${e instanceof Error ? e.message : String(e)}`));
  }

  showProfileCreationWarning(error: string): void {
    const message = `Dbt profile was not properly configured. ${error}`;
    console.log(message);
    this.connection.window.showWarningMessage(message);
  }

  showCreateContextWarning(error: string): void {
    const message = `Unable to initialize BigQuery. ${error}`;
    console.log(message);
    this.connection.window.showWarningMessage(message);
  }

  logStartupInfo(contextInfo: DbtProfileInfo, initTime: number): void {
    this.notificationSender.sendTelemetry('log', {
      dbtVersion: getStringVersion(this.featureFinder?.versionInfo?.installedVersion),
      pythonPath: this.featureFinder?.pythonInfo?.path ?? 'undefined',
      pythonVersion: this.featureFinder?.pythonInfo?.version?.join('.') ?? 'undefined',
      initTime: initTime.toString(),
      type: contextInfo.type ?? 'unknown type',
      method: contextInfo.method ?? 'unknown method',
    });
  }

  onDbtCompile(uri: string): void {
    this.openedDocuments.get(uri)?.forceRecompile();
  }

  onWillSaveTextDocument(params: WillSaveTextDocumentParams): void {
    this.openedDocuments.get(params.textDocument.uri)?.willSaveTextDocument(params.reason);
  }

  async onDidSaveTextDocument(params: DidSaveTextDocumentParams): Promise<void> {
    if (!(await this.isLanguageServerReady())) {
      return;
    }

    const document = this.openedDocuments.get(params.textDocument.uri);
    await document?.didSaveTextDocument(true);
  }

  onDidOpenTextDocumentDelayed(params: DidOpenTextDocumentParams): Promise<void> {
    this.openTextDocumentRequests.set(params.textDocument.uri, params);
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const openRequest = this.openTextDocumentRequests.get(params.textDocument.uri);
          if (openRequest) {
            this.openTextDocumentRequests.delete(params.textDocument.uri);
            await this.onDidOpenTextDocument(openRequest);
          }
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Failed to open document'));
        }
      }, LspServer.OPEN_CLOSE_DEBOUNCE_PERIOD);
    });
  }

  async onDidOpenTextDocument(params: DidOpenTextDocumentParams): Promise<void> {
    const { uri } = params.textDocument;
    let document = this.openedDocuments.get(uri);

    if (!document) {
      if (!(await this.isLanguageServerReady()) || !this.dbtContext.dbt) {
        return;
      }

      const dbtDocumentKind = this.dbtDocumentKindResolver.getDbtDocumentKind(this.workspaceFolder, uri);
      if (![DbtDocumentKind.MACRO, DbtDocumentKind.MODEL].includes(dbtDocumentKind)) {
        console.log('Not supported dbt document kind');
        return;
      }

      document = new DbtTextDocument(
        params.textDocument,
        dbtDocumentKind,
        this.workspaceFolder,
        this.notificationSender,
        this.progressReporter,
        this.sqlCompletionProvider,
        this.dbtCompletionProvider,
        this.dbtDefinitionProvider,
        new ModelCompiler(this.dbtContext.dbt, this.dbtRepository),
        new JinjaParser(),
        this.onGlobalDbtErrorFixedEmitter,
        this.dbtRepository,
        this.dbtContext,
        this.destinationState,
      );
      this.openedDocuments.set(uri, document);

      await document.didOpenTextDocument();
    }
  }

  async onDidChangeTextDocument(params: DidChangeTextDocumentParams): Promise<void> {
    if (!(await this.isLanguageServerReady())) {
      return;
    }
    this.openedDocuments.get(params.textDocument.uri)?.didChangeTextDocument(params);
  }

  async isLanguageServerReady(): Promise<boolean> {
    try {
      await this.dbtRepository.manifestParsedDeferred.promise;
      return true;
    } catch (e) {
      return false;
    }
  }

  onDidCloseTextDocumentDelayed(params: DidCloseTextDocumentParams): void {
    if (this.openTextDocumentRequests.has(params.textDocument.uri)) {
      this.openTextDocumentRequests.delete(params.textDocument.uri);
    }
  }

  onHover(hoverParams: HoverParams): Hover | null | undefined {
    const document = this.openedDocuments.get(hoverParams.textDocument.uri);
    return document?.onHover(hoverParams);
  }

  async onCompletion(completionParams: CompletionParams): Promise<CompletionItem[] | undefined> {
    const document = this.openedDocuments.get(completionParams.textDocument.uri);
    return document?.onCompletion(completionParams);
  }

  onCompletionResolve(item: CompletionItem): CompletionItem {
    return this.sqlCompletionProvider.onCompletionResolve(item);
  }

  onSignatureHelp(params: SignatureHelpParams): SignatureHelp | undefined {
    const document = this.openedDocuments.get(params.textDocument.uri);
    return document?.onSignatureHelp(params);
  }

  onDefinition(definitionParams: DefinitionParams): DefinitionLink[] | undefined {
    const document = this.openedDocuments.get(definitionParams.textDocument.uri);
    return document?.onDefinition(definitionParams);
  }

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    this.fileChangeListener.onDidChangeWatchedFiles(params);
  }

  onCodeAction(params: CodeActionParams): CodeAction[] {
    const title = 'Change to ref';
    return params.context.diagnostics
      .filter(d => d.source === 'dbt Wizard' && (d.data as { replaceText: string } | undefined)?.replaceText)
      .map<CodeAction>(d => ({
        title,
        diagnostics: [d],
        edit: {
          changes: {
            [params.textDocument.uri]: [TextEdit.replace(d.range, (d.data as { replaceText: string }).replaceText)],
          },
        },
        command: Command.create(title, this.sqlToRefCommandName, params.textDocument.uri, d.range),
        kind: CodeActionKind.QuickFix,
      }));
  }

  onExecuteCommand(params: ExecuteCommandParams): void {
    if (params.command === this.sqlToRefCommandName && params.arguments) {
      const textDocument = this.openedDocuments.get(params.arguments[0] as string);
      const range = params.arguments[1] as Range | undefined;
      if (textDocument && range) {
        textDocument.fixInformationDiagnostic(range);
      }
    }
  }

  onDidCreateFiles(_params: CreateFilesParams): void {
    this.dbtContext.refresh();
  }

  onDidRenameFiles(params: RenameFilesParams): void {
    this.dbtContext.refresh();
    this.disposeOutdatedDocuments(params.files.map(f => f.oldUri));
  }

  onDidDeleteFiles(params: DeleteFilesParams): void {
    this.dbtContext.refresh();
    this.disposeOutdatedDocuments(params.files.map(f => f.uri));
  }

  disposeOutdatedDocuments(uris: string[]): void {
    uris.forEach(uri => {
      this.openedDocuments.get(uri)?.dispose();
      this.openedDocuments.delete(uri);
    });
  }

  onShutdown(): void {
    this.dispose();
  }

  dispose(): void {
    console.log('Dispose start...');
    this.dbtContext.dispose();
    this.destinationState.dispose();
    this.onGlobalDbtErrorFixedEmitter.dispose();
    console.log('Dispose end.');
  }
}
