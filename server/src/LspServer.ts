import { AnalyzeRequest, Client, runServer, SimpleCatalog, SimpleColumn, SimpleTable, SimpleType, TypeKind } from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { ZetaSQLBuiltinFunctionOptions } from '@fivetrandevelopers/zetasql/lib/ZetaSQLBuiltinFunctionOptions';
import { Diagnostic, DiagnosticSeverity, DidChangeConfigurationNotification, Hover, HoverParams, InitializeParams, InitializeResult, Position, Range, TextDocumentChangeEvent, TextDocuments, TextDocumentSyncKind, _Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export class LspServer {
    connection: _Connection;
    documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
    catalog = new SimpleCatalog('catalog');
    hasConfigurationCapability: boolean = false;
    ast = {};

    constructor(connection: _Connection, documents: TextDocuments<TextDocument>) {
        this.connection = connection;
        this.documents = documents;
    }

    async initialize(params: InitializeParams) {
        await this.initizelizeZetasql();

        let capabilities = params.capabilities;
    
        // Does the client support the `workspace/configuration` request?
        // If not, we fall back using global settings.
        this.hasConfigurationCapability = !!(
            capabilities.workspace && !!capabilities.workspace.configuration
        );
    
        const result: InitializeResult = {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Incremental,
                hoverProvider : true,
            }
        };
        return result;
    }

    async initizelizeZetasql() {
        runServer().catch(err => console.error(err));
        await Client.INSTANCE.testConnection();
        await this.initializeCatalog();
    }
    
    async initializeCatalog() {
        const projectCatalog = new SimpleCatalog('digital-arbor-400');
        const datasetCatalog = new SimpleCatalog('pg_public');
        projectCatalog.addSimpleCatalog(datasetCatalog);
        this.catalog.addSimpleCatalog(projectCatalog);
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
        await this.catalog.addZetaSQLFunctions(new ZetaSQLBuiltinFunctionOptions(options));
        await this.catalog.register();
    }

    didChangeContent(change: TextDocumentChangeEvent<TextDocument>) {
        this.validateDocument(change.document);
    }

    async validateDocument(document: TextDocument): Promise<void> {
        const analyzeRequest: AnalyzeRequest = {
            sqlStatement: document.getText(),
            registeredCatalogId: this.catalog.registeredId,
            options: {
                errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
            },
        };
    
        const diagnostics: Diagnostic[] = [];
        try {
            this.ast = await Client.INSTANCE.analyze(analyzeRequest);
            // console.log(JSON.stringify(this.ast, null, "    ") );
        } catch (e) {
            // Parse string like 'Unrecognized name: paused1; Did you mean paused? [at 9:3]'
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
        this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
    }

    initialized() {
        if (this.hasConfigurationCapability) {
            // Register for all configuration changes.
            this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
        }    
    }

    hover(hoverParams: HoverParams): Hover {
		let document = this.documents.get(hoverParams.textDocument.uri);
		let text = this.documents.get(hoverParams.textDocument.uri)?.getText(Range.create(hoverParams.position.line, hoverParams.position.character, hoverParams.position.line, hoverParams.position.character));
		return {
			contents: {
				kind: 'markdown',
				value: `This is hover for \`${text}\``
			}
		}
    }
}
