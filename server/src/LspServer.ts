import { ZetaSQLClient, runServer, terminateServer } from '@fivetrandevelopers/zetasql';
import {
  CompletionItem,
  CompletionParams,
  DidChangeConfigurationNotification,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  DidSaveTextDocumentParams,
  HoverParams,
  InitializeError,
  InitializeParams,
  InitializeResult,
  ResponseError,
  SignatureHelp,
  SignatureHelpParams,
  TextDocumentSyncKind,
  _Connection,
} from 'vscode-languageserver';
import { CompletionProvider } from './CompletionProvider';
import { DbtServer as DbtServer } from './DbtServer';
import { DbtTextDocument } from './DbtTextDocument';
import { DestinationDefinition } from './DestinationDefinition';
import { ProgressReporter } from './ProgressReporter';
import { ServiceAccountCreds, YamlParser } from './YamlParser';

export class LspServer {
  connection: _Connection;
  hasConfigurationCapability: boolean = false;
  dbtServer = new DbtServer();
  openedDocuments = new Map<string, DbtTextDocument>();
  serviceAccountCreds: ServiceAccountCreds | undefined;
  destinationDefinition: DestinationDefinition | undefined;
  progressReporter: ProgressReporter;

  constructor(connection: _Connection) {
    this.connection = connection;
    this.progressReporter = new ProgressReporter(this.connection);
  }

  async onInitialize(params: InitializeParams) {
    process.on('SIGTERM', this.gracefulShutdown);
    process.on('SIGINT', this.gracefulShutdown);

    await this.initizelizeZetaSql();

    const findResult = new YamlParser().findProfileCreds();
    if (findResult.error) {
      return new ResponseError<InitializeError>(100, findResult.error, { retry: true });
    }
    this.serviceAccountCreds = findResult.creds;

    this.initializeDestinationDefinition();
    let capabilities = params.capabilities;

    this.initializeNotifications();

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    this.hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);

    return <InitializeResult>{
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        hoverProvider: true,
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: ['.'],
        },
        signatureHelpProvider: {
          triggerCharacters: ['('],
        },
      },
    };
  }

  initializeNotifications() {
    this.connection.onNotification('custom/dbtCompile', this.onDbtCompile.bind(this));
  }

  async onInitialized() {
    try {
      await this.dbtServer.startDbtRpc(() => this.connection.sendRequest('custom/getPython'));
    } catch (e) {
      this.connection.window.showErrorMessage(
        'Failed to start dbt. Make sure that you have dbt installed: https://docs.getdbt.com/dbt-cli/installation. ' + e,
      );
    }
    this.progressReporter.sendFinish();

    if (this.hasConfigurationCapability) {
      // Register for all configuration changes.
      this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
  }

  async onDbtCompile(uri: string) {
    let document = this.openedDocuments.get(uri);
    if (document) {
      await document.forceRecompile();
    }
  }

  async initizelizeZetaSql() {
    runServer().catch(err => console.error(err));
    await ZetaSQLClient.INSTANCE.testConnection();
  }

  async initializeDestinationDefinition() {
    if (this.serviceAccountCreds) {
      this.destinationDefinition = new DestinationDefinition(this.serviceAccountCreds);
    }
  }

  async onDidSaveTextDocument(params: DidSaveTextDocumentParams) {
    this.dbtServer.refreshServer();
  }

  async onDidOpenTextDocument(params: DidOpenTextDocumentParams) {
    if (!(await this.isDbtReady())) {
      return;
    }
    const uri = params.textDocument.uri;
    let document = this.openedDocuments.get(uri);
    if (!document) {
      document = new DbtTextDocument(params.textDocument, this.dbtServer, this.connection, this.progressReporter, this.serviceAccountCreds);
      this.openedDocuments.set(uri, document);
      document.didChangeTextDocument({ textDocument: params.textDocument, contentChanges: [] });
    }
  }

  async onDidChangeTextDocument(params: DidChangeTextDocumentParams) {
    if (!(await this.isDbtReady())) {
      return;
    }
    const document = this.openedDocuments.get(params.textDocument.uri);
    if (document) {
      await document.didChangeTextDocument(params);
    }
  }

  async isDbtReady() {
    try {
      await this.dbtServer.startPromise;
      return true;
    } catch (e) {
      return false;
    }
  }

  async onDidCloseTextDocument(params: DidCloseTextDocumentParams): Promise<void> {
    this.openedDocuments.delete(params.textDocument.uri);
  }

  async onHover(hoverParams: HoverParams) {
    const document = this.openedDocuments.get(hoverParams.textDocument.uri);
    return document?.onHover(hoverParams);
  }

  async onCompletion(completionParams: CompletionParams) {
    if (!this.destinationDefinition) {
      return undefined;
    }
    const document = this.openedDocuments.get(completionParams.textDocument.uri);
    return document?.onCompletion(completionParams, this.destinationDefinition);
  }

  async onCompletionResolve(item: CompletionItem) {
    return CompletionProvider.onCompletionResolve(item);
  }

  async onSignatureHelp(params: SignatureHelpParams): Promise<SignatureHelp | undefined> {
    const document = this.openedDocuments.get(params.textDocument.uri);
    return document?.onSignatureHelp(params);
  }

  async gracefulShutdown() {
    console.log('Graceful shutdown start...');
    terminateServer();
    console.log('Graceful shutdown end...');
  }
}
