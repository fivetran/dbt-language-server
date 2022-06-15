import { randomUUID } from 'crypto';
import { Result } from 'neverthrow';
import { performance } from 'perf_hooks';
import {
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  Command,
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
  ExecuteCommandParams,
  Hover,
  HoverParams,
  InitializeError,
  InitializeParams,
  InitializeResult,
  Range,
  ResponseError,
  SignatureHelp,
  SignatureHelpParams,
  TelemetryEventNotification,
  TextDocumentSyncKind,
  TextEdit,
  WillSaveTextDocumentParams,
  _Connection,
} from 'vscode-languageserver';
import { BigQueryContext } from './bigquery/BigQueryContext';
import { DbtCompletionProvider } from './completion/DbtCompletionProvider';
import { DbtProfileCreator, DbtProfileError, DbtProfileResult, DbtProfileSuccess } from './DbtProfileCreator';
import { DbtProject } from './DbtProject';
import { DbtRepository } from './DbtRepository';
import { DbtRpcClient } from './DbtRpcClient';
import { DbtRpcServer } from './DbtRpcServer';
import { DbtUtilitiesInstaller } from './DbtUtilitiesInstaller';
import { compareVersions, getStringVersion } from './DbtVersion';
import { Command as DbtCommand } from './dbt_commands/Command';
import { DbtDefinitionProvider } from './definition/DbtDefinitionProvider';
import { DbtDocumentKind } from './document/DbtDocumentKind';
import { DbtDocumentKindResolver } from './document/DbtDocumentKindResolver';
import { DbtTextDocument } from './document/DbtTextDocument';
import { FeatureFinder } from './FeatureFinder';
import { FileChangeListener } from './FileChangeListener';
import { JinjaParser } from './JinjaParser';
import { ManifestParser } from './manifest/ManifestParser';
import { ModelCompiler } from './ModelCompiler';
import { ProgressReporter } from './ProgressReporter';
import { SqlCompletionProvider } from './SqlCompletionProvider';
import { deferred } from './utils/Utils';

interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export class LspServer {
  static OPEN_CLOSE_DEBOUNCE_PERIOD = 1000;

  sqlToRefCommandName = randomUUID();
  workspaceFolder: string;
  python?: string;
  dbtProfileType?: string;
  hasConfigurationCapability = false;
  dbtRpcServer = new DbtRpcServer();
  dbtRpcClient = new DbtRpcClient();
  openedDocuments = new Map<string, DbtTextDocument>();
  progressReporter: ProgressReporter;
  fileChangeListener: FileChangeListener;
  completionProvider: SqlCompletionProvider;
  dbtCompletionProvider: DbtCompletionProvider;
  dbtDefinitionProvider: DbtDefinitionProvider;
  dbtProject = new DbtProject('.');
  dbtProfileCreator = new DbtProfileCreator(this.dbtProject, '~/.dbt/profiles.yml');
  manifestParser = new ManifestParser();
  dbtRepository = new DbtRepository();
  featureFinder = new FeatureFinder();
  dbtDocumentKindResolver = new DbtDocumentKindResolver(this.dbtRepository);
  initStart = performance.now();
  initDbtRpcAttempt = 0;
  onGlobalDbtErrorFixedEmitter = new Emitter<void>();

  bigQueryContext?: BigQueryContext;
  contextInitializedDeferred = deferred<void>();

  openTextDocumentRequests = new Map<string, DidOpenTextDocumentParams>();

  constructor(private connection: _Connection) {
    this.workspaceFolder = process.cwd();
    LspServer.prepareLogger(this.workspaceFolder);
    this.progressReporter = new ProgressReporter(this.connection);
    this.fileChangeListener = new FileChangeListener(this.workspaceFolder, this.dbtProject, this.manifestParser, this.dbtRepository);
    this.completionProvider = new SqlCompletionProvider();
    this.dbtCompletionProvider = new DbtCompletionProvider(this.dbtRepository);
    this.dbtDefinitionProvider = new DbtDefinitionProvider(this.dbtRepository);
    this.fileChangeListener.onDbtProjectYmlChanged(this.onDbtProjectYmlChanged.bind(this));
    this.fileChangeListener.onDbtPackagesYmlChanged(this.onDbtPackagesYmlChanged.bind(this));
    this.fileChangeListener.onDbtPackagesChanged(this.onDbtPackagesChanged.bind(this));
  }

  static prepareLogger(workspaceFolder: string): void {
    const id = workspaceFolder.substring(workspaceFolder.lastIndexOf('/') + 1);

    const old = console.log;
    console.log = (...args): void => {
      Array.prototype.unshift.call(args, `${id} ${new Date().toISOString()}: `);
      old.apply(console, args);
    };
  }

  onInitialize(params: InitializeParams): InitializeResult<unknown> | ResponseError<InitializeError> {
    console.log(`Starting server for folder ${this.workspaceFolder}`);

    process.on('uncaughtException', this.onUncaughtException.bind(this));
    process.on('SIGTERM', () => this.onShutdown());
    process.on('SIGINT', () => this.onShutdown());

    this.fileChangeListener.onInit();

    this.initializeNotifications();

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
      },
    };
  }

  onUncaughtException(error: Error, _origin: 'uncaughtException' | 'unhandledRejection'): void {
    console.log(error.stack);

    this.sendTelemetry('error', {
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
    if (this.hasConfigurationCapability) {
      // Register for all configuration changes.
      await this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }

    const profileResult = this.dbtProfileCreator.createDbtProfile();
    const contextInfo = profileResult.match<DbtProfileResult>(
      s => s,
      e => e,
    );
    this.dbtProfileType = profileResult.isOk() ? profileResult.value.type : profileResult.error.type;

    await Promise.all([this.prepareRpcServer(this.dbtProfileType), this.prepareDestination(profileResult)]);
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
    const message = `Only common dbt features will be available. Dbt profile was not configured. ${error}`;
    console.log(message);
    this.connection.window.showWarningMessage(message);
  }

  async prepareRpcServer(dbtProfileType?: string): Promise<void> {
    this.initDbtRpcAttempt++;

    this.python = await this.connection.sendRequest('custom/getPython');
    if (this.python === '') {
      this.onPythonWasNotFound();
      return;
    }
    if (this.python === 'python') {
      this.python = 'python3';
    }

    const [command, dbtPort] = await Promise.all([
      this.featureFinder.findDbtRpcCommand(this.python, dbtProfileType),
      this.featureFinder.findFreePort(),
    ]);

    if (command === undefined) {
      this.featureFinder = new FeatureFinder();
      try {
        if (dbtProfileType) {
          await this.suggestToInstallDbt(this.python, dbtProfileType);
        } else {
          await this.onRpcServerFindFailed();
        }
      } catch (e) {
        await this.onRpcServerFindFailed();
      }
    } else {
      this.checkDbtUpdateNeed(dbtProfileType);

      command.addParameter(dbtPort.toString());
      try {
        await this.startDbtRpc(command, dbtPort);
      } catch (e) {
        await this.onRpcServerStartFailed(e instanceof Error ? e.message : `Failed to start dbt-rpc. ${String(e)}`);
      }
    }
  }

  onPythonWasNotFound(): void {
    this.progressReporter.sendFinish();
    this.connection.window.showErrorMessage(
      'Python was not found in your working environment. dbt Wizard requires valid python installation. Please visit https://www.python.org/downloads/.',
    );
  }

  async onRpcServerFindFailed(): Promise<void> {
    this.progressReporter.sendFinish();
    await this.showStartDbtRpcError(
      `Failed to find dbt-rpc. You can use 'python3 -m pip install dbt-bigquery dbt-rpc' command to install it. Check in Terminal that dbt-rpc works running 'dbt-rpc --version' command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VS Code that was used to install dbt (e.g. ~/dbt-env/bin/python3).`,
    );
  }

  async onRpcServerStartFailed(message: string): Promise<void> {
    this.progressReporter.sendFinish();
    await this.showStartDbtRpcError(message);
  }

  async showStartDbtRpcError(message: string): Promise<void> {
    console.log(message);
    const actions = { title: 'Retry', id: 'retry' };
    const errorMessageResult = await this.connection.window.showErrorMessage(message, actions);
    if (errorMessageResult?.id === 'retry') {
      await this.prepareRpcServer(this.dbtProfileType);
    }
  }

  async suggestToInstallDbt(python: string, dbtProfileType: string): Promise<void> {
    const actions = { title: 'Install', id: 'install' };
    const errorMessageResult = await this.connection.window.showErrorMessage(
      'dbt is not installed. Would you like to install dbt and related packages?',
      actions,
    );

    if (errorMessageResult?.id === 'install') {
      console.log(`Trying to install dbt, dbt-rpc and ${dbtProfileType} adapter`);
      const packagesToInstall = DbtUtilitiesInstaller.getFullDbtInstallationPackages(dbtProfileType);
      const installResult = await DbtUtilitiesInstaller.installPackages(python, packagesToInstall);
      if (installResult.isOk()) {
        this.connection.window.showInformationMessage(installResult.value);
        await this.prepareRpcServer(dbtProfileType);
      } else {
        await this.onRpcServerStartFailed(installResult.error);
      }
    } else {
      await this.onRpcServerFindFailed();
    }
  }

  checkDbtUpdateNeed(dbtProfileType?: string): void {
    if (
      this.python &&
      dbtProfileType &&
      this.featureFinder.isDbtInPythonEnvironment &&
      this.featureFinder.versionInfo?.installedVersion &&
      this.featureFinder.versionInfo.latestVersion &&
      compareVersions(this.featureFinder.versionInfo.installedVersion, this.featureFinder.versionInfo.latestVersion) === -1
    ) {
      this.suggestToUpdateDbt(this.python, dbtProfileType)
        .then(() => this.connection.window.showInformationMessage('dbt successfully updated. Please reload vscode.'))
        .catch(() => this.connection.window.showErrorMessage('dbt update failed.'));
    }
  }

  async suggestToUpdateDbt(python: string, dbtProfileType: string): Promise<void> {
    const actions = { title: 'Update', id: 'update' };
    const informationMessageResult = await this.connection.window.showInformationMessage(
      'dbt installation is not up to date. Would you like to update dbt and related packages?',
      actions,
    );

    if (informationMessageResult?.id === 'update') {
      console.log(`Trying to update dbt`);
      const packagesToUpdate = [DbtUtilitiesInstaller.buildAdapterPackageName(dbtProfileType)];
      await DbtUtilitiesInstaller.installPackages(python, packagesToUpdate, true);
    }
  }

  logStartupInfo(contextInfo: DbtProfileResult, initTime: number, initDbtRpcAttempt: number): void {
    this.sendTelemetry('log', {
      dbtVersion: getStringVersion(this.featureFinder.versionInfo?.installedVersion),
      python: this.featureFinder.python ?? 'undefined',
      initTime: initTime.toString(),
      type: contextInfo.type ?? 'unknown type',
      method: contextInfo.method ?? 'unknown method',
      initDbtRpcAttempt: initDbtRpcAttempt.toString(),
    });
  }

  sendTelemetry(name: string, properties?: { [key: string]: string }): void {
    console.log(JSON.stringify(properties));
    this.connection
      .sendNotification<TelemetryEvent>(TelemetryEventNotification.type, { name, properties })
      .catch(e => console.log(`Failed to send notification: ${e instanceof Error ? e.message : String(e)}`));
  }

  async startDbtRpc(command: DbtCommand, port: number): Promise<void> {
    this.dbtRpcClient.setPort(port);
    try {
      await this.dbtRpcServer.startDbtRpc(command, this.dbtRpcClient);
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
          reject(e instanceof Error ? e : new Error('Failed to open document'));
        }
      }, LspServer.OPEN_CLOSE_DEBOUNCE_PERIOD);
    });
  }

  async onDidOpenTextDocument(params: DidOpenTextDocumentParams): Promise<void> {
    const { uri } = params.textDocument;
    let document = this.openedDocuments.get(uri);

    if (!document) {
      if (!(await this.isLanguageServerReady())) {
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
        this.connection,
        this.progressReporter,
        this.completionProvider,
        this.dbtCompletionProvider,
        this.dbtDefinitionProvider,
        new ModelCompiler(this.dbtRpcClient, this.dbtRepository),
        new JinjaParser(),
        this.onGlobalDbtErrorFixedEmitter,
        this.dbtRepository,
        this.bigQueryContext,
      );
      this.openedDocuments.set(uri, document);

      await document.didOpenTextDocument(!this.dbtRepository.manifestExists);
    }
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

  onDbtProjectYmlChanged(): void {
    this.dbtRpcServer.refreshServer();
  }

  onDbtPackagesYmlChanged(): void {
    this.dbtRpcServer.refreshServer();
  }

  onDbtPackagesChanged(): void {
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
