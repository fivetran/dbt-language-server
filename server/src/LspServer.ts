import { ZetaSQLClient, runServer, terminateServer } from '@fivetrandevelopers/zetasql';
import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import {
  DidChangeConfigurationNotification,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  DidSaveTextDocumentParams,
  HoverParams,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  _Connection,
} from 'vscode-languageserver';
import { DbtServer as DbtServer } from './DbtServer';
import { DbtTextDocument } from './DbtTextDocument';

export class LspServer {
  connection: _Connection;
  hasConfigurationCapability: boolean = false;
  ast = new Map<string, AnalyzeResponse>();
  dbtServer = new DbtServer();
  openedDocuments = new Map<string, DbtTextDocument>();

  constructor(connection: _Connection) {
    this.connection = connection;
  }

  async onInitialize(params: InitializeParams) {
    process.on('SIGTERM', this.gracefulShutdown);
    process.on('SIGINT', this.gracefulShutdown);

    console.log(process.versions);
    await this.initizelizeZetaSql();
    this.dbtServer.startDbtRpc();

    let capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    this.hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        hoverProvider: true,
      },
    };
    return result;
  }

  async initizelizeZetaSql() {
    runServer().catch(err => console.error(err));
    await ZetaSQLClient.INSTANCE.testConnection();
  }

  async onDidSaveTextDocument(params: DidSaveTextDocumentParams) {
    this.dbtServer.refreshServer();
  }

  async onDidOpenTextDocument(params: DidOpenTextDocumentParams) {
    const uri = params.textDocument.uri;
    let document = this.openedDocuments.get(uri);
    if (!document) {
      document = new DbtTextDocument(params.textDocument, this.dbtServer, this.connection);
      this.openedDocuments.set(uri, document);
    }
  }

  async onDidChangeTextDocument(params: DidChangeTextDocumentParams) {
    const document = this.openedDocuments.get(params.textDocument.uri);
    if (document) {
      await document.didChangeTextDocument(params);
    }
  }

  async onDidCloseTextDocument(params: DidCloseTextDocumentParams): Promise<void> {
    this.openedDocuments.delete(params.textDocument.uri);
  }

  onInitialized() {
    if (this.hasConfigurationCapability) {
      // Register for all configuration changes.
      this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
  }

  async onHover(hoverParams: HoverParams) {
    const document = this.openedDocuments.get(hoverParams.textDocument.uri);
    return document?.onHover(hoverParams);
  }

  async gracefulShutdown() {
    console.log('Graceful shutrown start...');
    terminateServer();
    console.log('Graceful shutrown end...');
  }
}
