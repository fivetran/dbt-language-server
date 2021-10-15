import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { LspServer } from './LspServer';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

const server = new LspServer(connection);

connection.onInitialize(server.onInitialize.bind(server));
connection.onInitialized(server.onInitialized.bind(server));
connection.onHover(server.onHover.bind(server));
connection.onCompletion(server.onCompletion.bind(server));
connection.onCompletionResolve(server.onCompletionResolve.bind(server));
connection.onSignatureHelp(server.onSignatureHelp.bind(server));

connection.onDidSaveTextDocument(server.onDidSaveTextDocument.bind(server));
connection.onDidOpenTextDocument(server.onDidOpenTextDocument.bind(server));
connection.onDidChangeTextDocument(server.onDidChangeTextDocument.bind(server));
connection.onDidCloseTextDocument(server.onDidCloseTextDocument.bind(server));

connection.onDidChangeWatchedFiles(server.onDidChangeWatchedFiles.bind(server));

connection.listen();
