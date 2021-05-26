import {
	createConnection,
	TextDocuments,
	ProposedFeatures} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { LspServer } from './LspServer';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const server = new LspServer(connection, documents);

connection.onInitialize(server.initialize.bind(server));
connection.onInitialized(server.initialized.bind(server));
connection.onHover(server.hover.bind(server));

documents.onDidChangeContent(server.didChangeContent.bind(server));

documents.listen(connection);
connection.listen();
