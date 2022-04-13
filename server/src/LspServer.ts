import { Result } from 'neverthrow';
import { performance } from 'perf_hooks';
import {
  CompletionItem,
  CompletionParams,
  DefinitionLink,
  DefinitionParams,
  DidChangeConfigurationNotification,
  DidChangeTextDocumentParams,
  DidChangeWatchedFilesParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  DidSaveTextDocumentParams,
  Emitter,
  Hover,
  HoverParams,
  InitializeError,
  InitializeParams,
  InitializeResult,
  ResponseError,
  SignatureHelp,
  SignatureHelpParams,
  TelemetryEventNotification,
  TextDocumentSyncKind,
  WillSaveTextDocumentParams,
  _Connection,
} from 'vscode-languageserver';
import { BigQueryContext } from './bigquery/BigQueryContext';
import { DbtCompletionProvider } from './completion/DbtCompletionProvider';
import { DbtProfileCreator, DbtProfileError, DbtProfileResult, DbtProfileSuccess } from './DbtProfileCreator';
import { DbtRepository } from './DbtRepository';
import { DbtRpcClient } from './DbtRpcClient';
import { DbtRpcServer } from './DbtRpcServer';
import { getStringVersion } from './DbtVersion';
import { Command } from './dbt_commands/Command';
import { DbtDefinitionProvider } from './definition/DbtDefinitionProvider';
import { DbtDocumentKind } from './document/DbtDocumentKind';
import { DbtTextDocument } from './document/DbtTextDocument';
import { FeatureFinder } from './FeatureFinder';
import { FileChangeListener } from './FileChangeListener';
import { JinjaParser } from './JinjaParser';
import { ManifestParser } from './manifest/ManifestParser';
import { ModelCompiler } from './ModelCompiler';
import { ProgressReporter } from './ProgressReporter';
import { SqlCompletionProvider } from './SqlCompletionProvider';
import { deferred, getFilePathRelatedToWorkspace } from './utils/Utils';
import { YamlParser } from './YamlParser';
import path = require('path');

interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export class LspServer {
  static OPEN_CLOSE_DEBOUNCE_PERIOD = 1000;

  workspaceFolder?: string;

  hasConfigurationCapability = false;
  dbtRpcServer = new DbtRpcServer();
  dbtRpcClient = new DbtRpcClient();
  openedDocuments = new Map<string, DbtTextDocument>();
  progressReporter: ProgressReporter;
  fileChangeListener: FileChangeListener;
  completionProvider: SqlCompletionProvider;
  dbtCompletionProvider: DbtCompletionProvider;
  dbtDefinitionProvider: DbtDefinitionProvider;
  yamlParser = new YamlParser();
  dbtProfileCreator = new DbtProfileCreator(this.yamlParser);
  manifestParser = new ManifestParser();
  dbtRepository = new DbtRepository();
  featureFinder = new FeatureFinder();
  initStart = performance.now();
  initDbtRpcAttempt = 0;
  onGlobalDbtErrorFixedEmitter = new Emitter<void>();

  bigQueryContext?: BigQueryContext;
  contextInitializedDeferred = deferred<void>();

  openTextDocumentRequests = new Map<string, DidOpenTextDocumentParams>();

  constructor(private connection: _Connection) {
    this.progressReporter = new ProgressReporter(this.connection);
    this.fileChangeListener = new FileChangeListener(this.yamlParser, this.manifestParser, this.dbtRepository);
    this.completionProvider = new SqlCompletionProvider();
    this.dbtCompletionProvider = new DbtCompletionProvider(this.dbtRepository);
    this.dbtDefinitionProvider = new DbtDefinitionProvider(this.dbtRepository);
    this.fileChangeListener.onDbtProjectYmlChanged(this.onDbtProjectYmlChanged.bind(this));
  }

  onInitialize(params: InitializeParams): InitializeResult<any> | ResponseError<InitializeError> {
    console.log(`Starting server for folder ${process.cwd()}`);

    process.on('SIGTERM', () => this.onShutdown());
    process.on('SIGINT', () => this.onShutdown());

    this.fileChangeListener.onInit();

    this.initializeNotifications();

    const { capabilities } = params;
    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    this.hasConfigurationCapability = Boolean(capabilities.workspace?.configuration);

    this.workspaceFolder = process.cwd();

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
      },
    };
  }

  initializeNotifications(): void {
    this.connection.onNotification('custom/dbtCompile', this.onDbtCompile.bind(this));
    this.connection.onNotification('custom/convertTo', this.convertTo.bind(this));
  }

  async onInitialized(): Promise<void> {
    if (this.hasConfigurationCapability) {
      // Register for all configuration changes.
      await this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }

    const profileResult = this.dbtProfileCreator.createDbtProfile();
    const contextInfo = profileResult.match<DbtProfileResult>(
      s => s,
      e => e,
    );

    await Promise.all([this.prepareRpcServer(), this.prepareDestination(profileResult)]);
    const initTime = performance.now() - this.initStart;
    this.logStartupInfo(contextInfo, initTime, this.initDbtRpcAttempt);
  }

  async prepareDestination(profileResult: Result<DbtProfileSuccess, DbtProfileError>): Promise<void> {
    if (profileResult.isOk()) {
      const bigQueryContextInfo = await BigQueryContext.createContext(profileResult.value);
      if (bigQueryContextInfo.isOk()) {
        this.bigQueryContext = bigQueryContextInfo.value;
      } else {
        this.showPrepareDestinationWarning(bigQueryContextInfo.error);
      }
    } else {
      this.showPrepareDestinationWarning(profileResult.error.message);
    }
    this.contextInitializedDeferred.resolve();
  }

  showPrepareDestinationWarning(error: string): void {
    this.connection.window.showWarningMessage(`Only common dbt features will be available. Dbt profile was not configured. ${error}`);
  }

  async prepareRpcServer(): Promise<void> {
    this.initDbtRpcAttempt++;

    const [command, dbtPort] = await Promise.all([
      this.featureFinder.findDbtRpcCommand(this.connection.sendRequest('custom/getPython')),
      this.featureFinder.findFreePort(),
    ]);

    if (command === undefined) {
      this.featureFinder = new FeatureFinder();
      this.progressReporter.sendFinish();
      return this.showStartDbtRpcError(
        `Failed to find dbt-rpc. You can use 'python3 -m pip install dbt-bigquery dbt-rpc' command to install it. Check in Terminal that dbt-rpc works running 'dbt-rpc --version' command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VS Code that was used to install dbt (e.g. ~/dbt-env/bin/python3).`,
      );
    }

    command.addParameter(dbtPort.toString());
    return this.startDbtRpc(command, dbtPort);
  }

  async showStartDbtRpcError(message: string): Promise<void> {
    const actions = { title: 'Retry', id: 'retry' };
    const errorMessageResult = await this.connection.window.showErrorMessage(message, actions);
    if (errorMessageResult?.id === 'retry') {
      await this.prepareRpcServer();
    }
  }

  logStartupInfo(contextInfo: DbtProfileResult, initTime: number, initDbtRpcAttempt: number): void {
    this.sendTelemetry('log', {
      dbtVersion: getStringVersion(this.featureFinder.version),
      python: this.featureFinder.python ?? 'undefined',
      initTime: initTime.toString(),
      type: contextInfo.type ?? 'unknown type',
      method: contextInfo.method ?? 'unknown method',
      initDbtRpcAttempt: initDbtRpcAttempt.toString(),
    });
  }

  sendTelemetry(name: string, properties?: { [key: string]: string }): void {
    console.log(`Telemetry log: ${JSON.stringify(properties)}`);
    this.connection.sendNotification<TelemetryEvent>(TelemetryEventNotification.type, { name, properties });
  }

  async startDbtRpc(command: Command, port: number): Promise<void> {
    this.dbtRpcClient.setPort(port);
    try {
      await this.dbtRpcServer.startDbtRpc(command, this.dbtRpcClient);
    } catch (e) {
      console.log(e);
    } finally {
      this.progressReporter.sendFinish();
    }
  }

  onDbtCompile(uri: string): void {
    const document = this.openedDocuments.get(uri);
    if (document) {
      document.forceRecompile();
    }
  }

  async convertTo(params: any): Promise<void> {
    const document = this.openedDocuments.get(params.uri);
    if (document) {
      if (params.to === 'sql') {
        await document.refToSql();
      } else if (params.to === 'ref') {
        await document.sqlToRef();
      }
    }
  }

  onWillSaveTextDocument(params: WillSaveTextDocumentParams): void {
    const document = this.openedDocuments.get(params.textDocument.uri);
    if (document) {
      document.willSaveTextDocument(params.reason);
    }
  }

  async onDidSaveTextDocument(params: DidSaveTextDocumentParams): Promise<void> {
    if (!(await this.isLanguageServerReady())) {
      return;
    }

    const document = this.openedDocuments.get(params.textDocument.uri);
    if (document) {
      await document.didSaveTextDocument(this.dbtRpcServer);
    }
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
          reject();
        }
      }, LspServer.OPEN_CLOSE_DEBOUNCE_PERIOD);
    });
  }

  async onDidOpenTextDocument(params: DidOpenTextDocumentParams): Promise<void> {
    const { uri } = params.textDocument;
    let document = this.openedDocuments.get(uri);

    if (this.workspaceFolder === undefined) {
      console.log('Current working directory is not specified');
      return;
    }

    if (!document) {
      if (!(await this.isLanguageServerReady())) {
        return;
      }

      const dbtDocumentKind = this.getDbtDocumentKind(this.workspaceFolder, uri);
      if (![DbtDocumentKind.MACRO, DbtDocumentKind.MODEL].includes(dbtDocumentKind)) {
        console.log('Not supported dbt document kind');
        return;
      }

      document = new DbtTextDocument(
        params.textDocument,
        dbtDocumentKind,
        this.workspaceFolder,
        this.connection,
        this.progressReporter,
        this.completionProvider,
        this.dbtCompletionProvider,
        this.dbtDefinitionProvider,
        new ModelCompiler(this.dbtRpcClient),
        new JinjaParser(),
        this.onGlobalDbtErrorFixedEmitter,
        this.dbtRepository,
        this.bigQueryContext,
      );
      this.openedDocuments.set(uri, document);

      await document.didOpenTextDocument(!this.dbtRepository.manifestExists);
    }
  }

  getDbtDocumentKind(workspaceFolder: string, uri: string): DbtDocumentKind {
    const filePath = getFilePathRelatedToWorkspace(uri, workspaceFolder);

    if (this.dbtRepository.macroPaths.some(p => filePath.startsWith(p + path.sep))) {
      return DbtDocumentKind.MACRO;
    }
    if (this.dbtRepository.modelPaths.some(p => filePath.startsWith(p + path.sep))) {
      return DbtDocumentKind.MODEL;
    }

    if (this.dbtRepository.packagesInstallPaths.some(p => filePath.startsWith(p))) {
      // let currentPath = uri;
      // do {
      //   currentPath = path.resolve(currentPath, '..');
      //   try {
      //     fs.statSync(path.resolve(currentPath, DbtRepository.DBT_PROJECT_FILE_NAME));
      //   } catch (e) {
      //     // file does not exist
      //   }
      // } while (path.resolve(currentPath) !== path.resolve(workspaceFolder));
    }

    return DbtDocumentKind.UNKNOWN;
  }

  async onDidChangeTextDocument(params: DidChangeTextDocumentParams): Promise<void> {
    if (!(await this.isLanguageServerReady())) {
      return;
    }
    const document = this.openedDocuments.get(params.textDocument.uri);
    if (document) {
      document.didChangeTextDocument(params);
    }
  }

  async isLanguageServerReady(): Promise<boolean> {
    try {
      await Promise.all([this.dbtRpcServer.startDeferred.promise, this.contextInitializedDeferred.promise]);
      return true;
    } catch (e) {
      return false;
    }
  }

  onDidCloseTextDocumentDelayed(params: DidCloseTextDocumentParams): void {
    if (this.openTextDocumentRequests.has(params.textDocument.uri)) {
      this.openTextDocumentRequests.delete(params.textDocument.uri);
    } else {
      this.onDidCloseTextDocument(params);
    }
  }

  onDidCloseTextDocument(params: DidCloseTextDocumentParams): void {
    this.openedDocuments.delete(params.textDocument.uri);
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
    return this.completionProvider.onCompletionResolve(item);
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

  onDbtProjectYmlChanged(): void {
    this.dbtRpcServer.refreshServer();
  }

  onShutdown(): void {
    this.dispose();
  }

  dispose(): void {
    console.log('Dispose start...');
    this.dbtRpcServer.dispose();
    this.bigQueryContext?.dispose();
    this.onGlobalDbtErrorFixedEmitter.dispose();
    console.log('Dispose end.');
  }
}
