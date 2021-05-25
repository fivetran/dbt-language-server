import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	Hover,
	HoverParams,
	Range,
	Diagnostic,
	DiagnosticSeverity,
	Position
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { AnalyzeRequest, Client, runServer, SimpleCatalog, SimpleColumn, SimpleTable, SimpleType, TypeKind } from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { ZetaSQLBuiltinFunctionOptions } from '@fivetrandevelopers/zetasql/lib/ZetaSQLBuiltinFunctionOptions';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
const catalog = new SimpleCatalog('catalog');

connection.onInitialize(async (params: InitializeParams) => {
	await initizelizeZetasql();

	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {
				resolveProvider: true
			},
			hoverProvider : false,
		}
	};
	return result;
});

async function initizelizeZetasql() {
	runServer().catch(err => console.error(err));
	await Client.INSTANCE.testConnection();
	await initializeCatalog();
}

async function initializeCatalog() {
	const projectCatalog = new SimpleCatalog('digital-arbor-400');
	const datasetCatalog = new SimpleCatalog('pg_public');
	projectCatalog.addSimpleCatalog(datasetCatalog);
	catalog.addSimpleCatalog(projectCatalog);
	datasetCatalog.addSimpleTable('transformations',
	  new SimpleTable('`digital-arbor-400`.pg_public.transformations', undefined, [
		new SimpleColumn('transformations', 'id', new SimpleType(TypeKind.TYPE_STRING)),
		new SimpleColumn('transformations', 'name', new SimpleType(TypeKind.TYPE_STRING)),
		new SimpleColumn('transformations', 'group_id', new SimpleType(TypeKind.TYPE_STRING)),
		new SimpleColumn('transformations', 'paused', new SimpleType(TypeKind.TYPE_BOOL)),
		new SimpleColumn('transformations', 'trigger', new SimpleType(TypeKind.TYPE_STRING)),
		new SimpleColumn('transformations', 'created_at', new SimpleType(TypeKind.TYPE_TIMESTAMP)),
		new SimpleColumn('transformations', 'created_by_id', new SimpleType(TypeKind.TYPE_STRING)),
		new SimpleColumn(
		  'transformations',
		  'last_started_at',
		  new SimpleType(TypeKind.TYPE_TIMESTAMP),
		),
		new SimpleColumn('transformations', 'status', new SimpleType(TypeKind.TYPE_STRING)),
		new SimpleColumn('transformations', '_fivetran_deleted', new SimpleType(TypeKind.TYPE_BOOL)),
	  ]),
	);
	const options = await new LanguageOptions().enableMaximumLanguageFeatures();
	await catalog.addZetaSQLFunctions(new ZetaSQLBuiltinFunctionOptions(options));
	await catalog.register();
}

// This event is emitted when the document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateDocument(change.document);
});

async function validateDocument(document: TextDocument): Promise<void> {
	const analyzeRequest: AnalyzeRequest = {
		sqlStatement: document.getText(),
		registeredCatalogId: catalog.registeredId,
		options: {
			errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
		},
	};

	const diagnostics: Diagnostic[] = [];
	try {
		await Client.INSTANCE.analyze(analyzeRequest);
	} catch (e) {
		// parse string like 'Unrecognized name: paused1; Did you mean paused? [at 9:3]'
		if (e.code == 3) {
			let matchResults = e.details.match(/(.*?) \[at (\d+):(\d+)\]/);
			let position = Position.create(matchResults[2] - 1, matchResults[3] - 1);

			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: {
					start: position,
					end: position,
				},
				message: matchResults[1],
			};
			diagnostics.push(diagnostic);
		}
	}
	connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2
			}
		];
	}
);

// connection.onHover(
// 	(hoverParams: HoverParams): Hover => {
// 		let text = documents.get(hoverParams.textDocument.uri)?.getText(Range.create(hoverParams.position.line, hoverParams.position.character, hoverParams.position.line, hoverParams.position.character + 1));
// 		return {
// 			contents: {
// 				kind: 'markdown',
// 				value: `This is hover for \`${text}\``
// 			}
// 		}
// 	}
// );

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

documents.listen(connection);
connection.listen();
