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
import { BigQueryClient } from './bigquery/BigQueryClient';
import { CompletionProvider } from './CompletionProvider';
import { DbtProfileCreator } from './DbtProfileCreator';
import { DbtServer as DbtServer } from './DbtServer';
import { DbtTextDocument } from './DbtTextDocument';
import { getStringVersion } from './DbtVersion';
import { Command } from './dbt_commands/Command';
import { DestinationDefinition } from './DestinationDefinition';
import { FeatureFinder } from './FeatureFinder';
import { FileChangeListener } from './FileChangeListener';
import { ManifestParser } from './ManifestParser';
import { ModelCompiler } from './ModelCompiler';
import { ProgressReporter } from './ProgressReporter';
import { randomNumber } from './Utils';
import { YamlParser } from './YamlParser';
import findFreePortPmfy = require('find-free-port');

interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export class LspServer {
  workspaceFolder?: string;
  bigQueryClient?: BigQueryClient;
  destinationDefinition?: DestinationDefinition;

  hasConfigurationCapability = false;
  dbtServer = new DbtServer();
  openedDocuments = new Map<string, DbtTextDocument>();
  progressReporter: ProgressReporter;
  completionProvider = new CompletionProvider();
  yamlParser = new YamlParser();
  dbtProfileCreator = new DbtProfileCreator(this.yamlParser);
  manifestParser = new ManifestParser();
  featureFinder = new FeatureFinder();
  fileChangeListener: FileChangeListener;
  initStart = performance.now();

  constructor(private connection: _Connection) {
    this.progressReporter = new ProgressReporter(this.connection);
    this.fileChangeListener = new FileChangeListener(this.completionProvider, this.yamlParser, this.manifestParser, this.dbtServer);
  }

  async onInitialize(params: InitializeParams): Promise<InitializeResult<any> | ResponseError<InitializeError>> {
    console.log(`Starting server for folder ${process.cwd()}`);

    process.on('SIGTERM', this.onShutdown);
    process.on('SIGINT', this.onShutdown);

    const profileResult = await this.dbtProfileCreator.createDbtProfile();
    if ('error' in profileResult) {
      return new ResponseError<InitializeError>(100, profileResult.error, { retry: true });
    }

    const clientResult = await this.dbtProfileCreator.createDbtClient(profileResult.dbtProfile, profileResult.targetConfig);
    if ('error' in clientResult) {
      return new ResponseError<InitializeError>(100, clientResult.error, { retry: true });
    }

    this.bigQueryClient = <BigQueryClient>clientResult.client;

    this.initializeDestinationDefinition();

    this.initializeNotifications();

    const { capabilities } = params;
    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    this.hasConfigurationCapability = Boolean(capabilities.workspace?.configuration);

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
    this.connection.onNotification('custom/convertTo', this.convertTo.bind(this));
  }

  async onInitialized(): Promise<void> {
    if (this.hasConfigurationCapability) {
      // Register for all configuration changes.
      await this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    const [command, dbtPort] = await Promise.all([
      this.featureFinder.findDbtRpcCommand(this.connection.sendRequest('custom/getPython')),
      this.featureFinder.findFreePort(),
    ]);

    if (command === undefined) {
      const errorMessageResult = await this.connection.window.showErrorMessage(
        `Failed to find dbt-rpc. You can use 'python3 -m pip install dbt-bigquery dbt-rpc' command to install it. Check in Terminal that dbt-rpc works running 'dbt-rpc --version' command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VS Code that was used to install dbt (e.g. ~/dbt-env/bin/python3).`,
        { title: 'Retry', id: 'retry' },
      );
      if (errorMessageResult?.id === 'retry') {
        this.featureFinder = new FeatureFinder();
        await this.onInitialized();
      }
      return;
    }

    command.addParameter(dbtPort.toString());
    await Promise.all([this.startDbtRpc(command, dbtPort), this.initializeZetaSql()]);
    this.fileChangeListener.onInit();
  }

  sendTelemetry(name: string, properties?: { [key: string]: string }): void {
    console.log(`Telemetry log: ${JSON.stringify(properties)}`);
    this.connection.sendNotification(TelemetryEventNotification.type, <TelemetryEvent>{ name, properties });
  }

  async startDbtRpc(command: Command, port: number): Promise<void> {
    try {
      await this.dbtServer.startDbtRpc(command, port);
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

  async onDbtCompile(uri: string): Promise<void> {
    const document = this.openedDocuments.get(uri);
    if (document) {
      await document.forceRecompile();
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

  async initializeZetaSql(): Promise<void> {
    const port = await findFreePortPmfy(randomNumber(1024, 65535));
    console.log(`Starting zetasql on port ${port}`);
    runServer(port).catch(err => console.error(err));
    ZetaSQLClient.init(port);
    await ZetaSQLClient.getInstance().testConnection();
  }

  initializeDestinationDefinition(): void {
    if (this.bigQueryClient) {
      this.destinationDefinition = new DestinationDefinition(this.bigQueryClient);
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
    const { uri } = params.textDocument;
    let document = this.openedDocuments.get(uri);

    if (this.workspaceFolder === undefined) {
      console.log('Current working directory is not specified');
      return;
    }

    if (!document && this.bigQueryClient) {
      document = new DbtTextDocument(
        params.textDocument,
        this.dbtServer,
        this.connection,
        this.progressReporter,
        this.completionProvider,
        new ModelCompiler(this.dbtServer, uri, this.workspaceFolder),
        this.bigQueryClient,
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
    this.fileChangeListener.onDidChangeWatchedFiles(params);
  }

  onShutdown(): void {
    this.dispose();
  }

  dispose(): void {
    console.log('Dispose start...');
    this.dbtServer.dispose();
    void terminateServer();
    console.log('Dispose end.');
  }
}
