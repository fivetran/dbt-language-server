import { runServer, terminateServer, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { performance } from 'perf_hooks';
import {
  CompletionItem,
  CompletionParams,
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
  _Connection,
} from 'vscode-languageserver';
import { CompletionProvider } from './CompletionProvider';
import { DbtServer as DbtServer } from './DbtServer';
import { DbtTextDocument } from './DbtTextDocument';
import { DestinationDefinition } from './DestinationDefinition';
import { ManifestParser } from './ManifestParser';
import { ProgressReporter } from './ProgressReporter';
import { ServiceAccountCredentials, ServiceAccountJsonCredentials, YamlParser } from './YamlParser';

interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export class LspServer {
  connection: _Connection;
  hasConfigurationCapability = false;
  workspaceFolder?: string;
  dbtServer = new DbtServer();
  openedDocuments = new Map<string, DbtTextDocument>();
  serviceAccountCredentials?: ServiceAccountCredentials | ServiceAccountJsonCredentials;
  destinationDefinition: DestinationDefinition | undefined;
  progressReporter: ProgressReporter;
  completionProvider = new CompletionProvider();
  yamlParser = new YamlParser();
  manifestParser = new ManifestParser();
  initStart = performance.now();

  constructor(connection: _Connection) {
    this.connection = connection;
    this.progressReporter = new ProgressReporter(this.connection);
  }

  async onInitialize(params: InitializeParams): Promise<InitializeResult<any> | ResponseError<InitializeError>> {
    process.on('SIGTERM', this.gracefulShutdown);
    process.on('SIGINT', this.gracefulShutdown);

    const findResult = this.yamlParser.findProfileCredentials();
    if (findResult.error) {
      return new ResponseError<InitializeError>(100, findResult.error, { retry: true });
    }
    this.serviceAccountCredentials = findResult.credentials;

    this.initializeDestinationDefinition();

    this.initializeNotifications();

    const capabilities = params.capabilities;
    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    this.hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);

    this.workspaceFolder = process.cwd();

    return <InitializeResult>{
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        hoverProvider: true,
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: ['.', '(', '"', "'"],
        },
        signatureHelpProvider: {
          triggerCharacters: ['('],
        },
      },
    };
  }

  initializeNotifications(): void {
    this.connection.onNotification('custom/dbtCompile', this.onDbtCompile.bind(this));
  }

  async onInitialized(): Promise<void> {
    if (this.hasConfigurationCapability) {
      // Register for all configuration changes.
      await this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    this.updateModels();
    await Promise.all([this.initializeZetaSql(), this.startDbtRpc()]);
  }

  sendTelemetry(name: string, properties?: { [key: string]: string }): void {
    console.log('Telemetry log: ' + JSON.stringify(properties));
    this.connection.sendNotification(TelemetryEventNotification.type, <TelemetryEvent>{ name: name, properties: properties });
  }

  async startDbtRpc(): Promise<void> {
    try {
      await this.dbtServer.startDbtRpc(() => this.connection.sendRequest('custom/getPython'));
      const initTime = performance.now() - this.initStart;
      this.sendTelemetry('log', {
        dbtVersion: this.dbtServer.dbtVersion ?? 'undefined',
        python: this.dbtServer.python ?? 'undefined',
        initTime: initTime.toString(),
      });
    } catch (e) {
      console.log(e);
      const errorMessageResult = await this.connection.window.showErrorMessage(
        `Failed to start dbt. Make sure that you have [dbt installed](https://docs.getdbt.com/dbt-cli/installation). Check in Terminal that dbt works running 'dbt --version' command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VSCode that was used to install dbt (e.g. ~/dbt-env/bin/python3).`,
        { title: 'Retry', id: 'retry' },
      );
      if (errorMessageResult?.id === 'retry') {
        await this.startDbtRpc();
      }
    } finally {
      this.progressReporter.sendFinish();
    }
  }

  async onDbtCompile(uri: string): Promise<void> {
    const document = this.openedDocuments.get(uri);
    if (document) {
      await document.forceRecompile();
    }
  }

  async initializeZetaSql(): Promise<void> {
    runServer().catch(err => console.error(err));
    await ZetaSQLClient.INSTANCE.testConnection();
  }

  initializeDestinationDefinition(): void {
    if (this.serviceAccountCredentials) {
      this.destinationDefinition = new DestinationDefinition(this.serviceAccountCredentials);
    }
  }

  async onDidSaveTextDocument(params: DidSaveTextDocumentParams): Promise<void> {
    if (!(await this.isDbtReady())) {
      return;
    }

    const document = this.openedDocuments.get(params.textDocument.uri);
    if (document) {
      await document.didSaveTextDocument();
    }
  }

  async onDidOpenTextDocument(params: DidOpenTextDocumentParams): Promise<void> {
    const uri = params.textDocument.uri;
    let document = this.openedDocuments.get(uri);

    if (this.workspaceFolder === undefined) {
      console.log('Current working directory is not specified');
      return;
    }

    if (!document && this.serviceAccountCredentials) {
      document = new DbtTextDocument(
        params.textDocument,
        this.dbtServer,
        this.connection,
        this.progressReporter,
        this.completionProvider,
        this.serviceAccountCredentials,
        this.workspaceFolder,
      );
      this.openedDocuments.set(uri, document);

      if (!(await this.isDbtReady())) {
        return;
      }
      await document.didOpenTextDocument();
    }
  }

  async onDidChangeTextDocument(params: DidChangeTextDocumentParams): Promise<void> {
    if (!(await this.isDbtReady())) {
      return;
    }
    const document = this.openedDocuments.get(params.textDocument.uri);
    if (document) {
      await document.didChangeTextDocument(params);
    }
  }

  async isDbtReady(): Promise<boolean> {
    try {
      await this.dbtServer.startDeferred.promise;
      return true;
    } catch (e) {
      return false;
    }
  }

  onDidCloseTextDocument(params: DidCloseTextDocumentParams): void {
    this.openedDocuments.delete(params.textDocument.uri);
  }

  async onHover(hoverParams: HoverParams): Promise<Hover | null | undefined> {
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

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    for (const change of params.changes) {
      if (change.uri.endsWith('target/manifest.json')) {
        this.updateModels();
      }
    }
  }

  updateModels(): void {
    this.completionProvider.setDbtModels(this.manifestParser.getModels(this.yamlParser.findTargetPath()));
  }

  gracefulShutdown(): void {
    console.log('Graceful shutdown start...');
    terminateServer();
    console.log('Graceful shutdown end...');
  }
}
