import { err, ok, Result } from 'neverthrow';
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
import { BigQueryClient } from './bigquery/BigQueryClient';
import { CompletionProvider } from './CompletionProvider';
import { DbtProfileCreator } from './DbtProfileCreator';
import { DbtRpcClient } from './DbtRpcClient';
import { DbtRpcServer } from './DbtRpcServer';
import { DbtTextDocument } from './DbtTextDocument';
import { getStringVersion } from './DbtVersion';
import { Command } from './dbt_commands/Command';
import { JinjaDefinitionProvider } from './definition/JinjaDefinitionProvider';
import { DestinationDefinition } from './DestinationDefinition';
import { FeatureFinder } from './FeatureFinder';
import { FileChangeListener } from './FileChangeListener';
import { JinjaParser } from './JinjaParser';
import { ManifestParser } from './manifest/ManifestParser';
import { ModelCompiler } from './ModelCompiler';
import { ProgressReporter } from './ProgressReporter';
import { SchemaTracker } from './SchemaTracker';
import { YamlParser } from './YamlParser';
import { ZetaSqlWrapper } from './ZetaSqlWrapper';

interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export class LspServer {
  static OPEN_CLOSE_DEBOUNCE_PERIOD = 1000;

  workspaceFolder?: string;
  bigQueryClient?: BigQueryClient;
  destinationDefinition?: DestinationDefinition;

  hasConfigurationCapability = false;
  dbtRpcServer = new DbtRpcServer();
  dbtRpcClient = new DbtRpcClient();
  openedDocuments = new Map<string, DbtTextDocument>();
  progressReporter: ProgressReporter;
  fileChangeListener: FileChangeListener;
  completionProvider: CompletionProvider;
  jinjaDefinitionProvider: JinjaDefinitionProvider;
  yamlParser = new YamlParser();
  dbtProfileCreator = new DbtProfileCreator(this.yamlParser);
  manifestParser = new ManifestParser();
  featureFinder = new FeatureFinder();
  initStart = performance.now();
  zetaSqlWrapper = new ZetaSqlWrapper();

  openTextDocumentRequests = new Map<string, DidOpenTextDocumentParams>();

  constructor(private connection: _Connection) {
    this.progressReporter = new ProgressReporter(this.connection);
    this.fileChangeListener = new FileChangeListener(this.yamlParser, this.manifestParser);
    this.completionProvider = new CompletionProvider(this.fileChangeListener.onModelsChanged);
    this.jinjaDefinitionProvider = new JinjaDefinitionProvider(
      this.fileChangeListener.onProjectNameChanged,
      this.fileChangeListener.onModelsChanged,
      this.fileChangeListener.onMacrosChanged,
      this.fileChangeListener.onSourcesChanged,
    );
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

    const initializeDestinationResult = await this.initializeDestination();
    if (initializeDestinationResult.isErr()) {
      void this.connection.window.showWarningMessage(
        `Only common dbt features will be available. Dbt profile was not configured. ${initializeDestinationResult.error}`,
      );
    }

    const [command, dbtPort] = await Promise.all([
      this.featureFinder.findDbtRpcCommand(this.connection.sendRequest('custom/getPython')),
      this.featureFinder.findFreePort(),
    ]);

    if (command === undefined) {
      return this.onInitializedRetry(
        `Failed to find dbt-rpc. You can use 'python3 -m pip install dbt-bigquery dbt-rpc' command to install it. Check in Terminal that dbt-rpc works running 'dbt-rpc --version' command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VS Code that was used to install dbt (e.g. ~/dbt-env/bin/python3).`,
      );
    }

    command.addParameter(dbtPort.toString());
    await this.startDbtRpc(command, dbtPort);

    try {
      await this.dbtRpcServer.startDeferred.promise;
    } catch (e) {
      return this.onInitializedRetry('Failed to start dbt rpc. Check your dbt profile configuration.');
    }

    return Promise.resolve();
  }

  async onInitializedRetry(message: string): Promise<void> {
    const errorMessageResult = await this.connection.window.showErrorMessage(message, { title: 'Retry', id: 'retry' });
    if (errorMessageResult?.id === 'retry') {
      this.featureFinder = new FeatureFinder();
      return this.onInitialized();
    }
    return Promise.resolve();
  }

  sendTelemetry(name: string, properties?: { [key: string]: string }): void {
    console.log(`Telemetry log: ${JSON.stringify(properties)}`);
    this.connection.sendNotification<TelemetryEvent>(TelemetryEventNotification.type, { name, properties });
  }

  async startDbtRpc(command: Command, port: number): Promise<void> {
    this.dbtRpcClient.setPort(port);
    try {
      await this.dbtRpcServer.startDbtRpc(command, this.dbtRpcClient);
      const initTime = performance.now() - this.initStart;
      this.sendTelemetry('log', {
        dbtVersion: getStringVersion(this.featureFinder.version),
        python: this.featureFinder.python ?? 'undefined',
        initTime: initTime.toString(),
      });
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

  async initializeDestination(): Promise<Result<void, string>> {
    try {
      const profileResult = this.dbtProfileCreator.createDbtProfile();
      if (profileResult.isErr()) {
        return err(profileResult.error);
      }

      const clientResult = await profileResult.value.dbtProfile.createClient(profileResult.value.targetConfig);
      if (clientResult.isErr()) {
        return err(clientResult.error);
      }

      this.bigQueryClient = clientResult.value as BigQueryClient;
      this.destinationDefinition = new DestinationDefinition(this.bigQueryClient);

      await this.zetaSqlWrapper.initializeZetaSql();

      return ok(undefined);
    } catch (e) {
      return err('Data Warehouse initialization failed.');
    }
  }

  onWillSaveTextDocument(params: WillSaveTextDocumentParams): void {
    const document = this.openedDocuments.get(params.textDocument.uri);
    if (document) {
      document.willSaveTextDocument(params.reason);
    }
  }

  async onDidSaveTextDocument(params: DidSaveTextDocumentParams): Promise<void> {
    if (!(await this.isDbtReady())) {
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
      if (!(await this.isDbtReady())) {
        return;
      }

      document = new DbtTextDocument(
        params.textDocument,
        this.connection,
        this.progressReporter,
        this.completionProvider,
        this.jinjaDefinitionProvider,
        new ModelCompiler(this.dbtRpcClient, uri, this.workspaceFolder),
        new JinjaParser(),
        this.bigQueryClient ? new SchemaTracker(this.bigQueryClient, this.zetaSqlWrapper) : undefined,
        this.bigQueryClient ? this.zetaSqlWrapper : undefined,
      );
      this.openedDocuments.set(uri, document);

      await document.didOpenTextDocument(!this.fileChangeListener.manifestExists);
    }
  }

  async onDidChangeTextDocument(params: DidChangeTextDocumentParams): Promise<void> {
    if (!(await this.isDbtReady())) {
      return;
    }
    const document = this.openedDocuments.get(params.textDocument.uri);
    if (document) {
      document.didChangeTextDocument(params);
    }
  }

  async isDbtReady(): Promise<boolean> {
    try {
      await this.dbtRpcServer.startDeferred.promise;
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
    if (!this.destinationDefinition) {
      return undefined;
    }
    const document = this.openedDocuments.get(completionParams.textDocument.uri);
    return document?.onCompletion(completionParams, this.destinationDefinition);
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
    void this.zetaSqlWrapper.terminateServer();
    console.log('Dispose end.');
  }
}
