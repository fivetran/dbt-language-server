import { AnalyzeRequest, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import {
  CompletionItem,
  CompletionParams,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeTextDocumentParams,
  Hover,
  HoverParams,
  Position,
  Range,
  TextDocumentItem,
  _Connection,
} from 'vscode-languageserver';
import { TextDocument, TextDocumentContentChangeEvent } from 'vscode-languageserver-textdocument';
import { CompletionProvider } from './CompletionProvider';
import { DbtServer } from './DbtServer';
import { DestinationDefinition } from './DestinationDefinition';
import { DiffTracker } from './DiffTracker';
import { HoverProvider } from './HoverProvider';
import { ModelCompiler } from './ModelCompiler';
import { SchemaTracker } from './SchemaTracker';
import { ServiceAccountCreds } from './YamlParser';
import { ZetaSQLCatalog } from './ZetaSQLCatalog';

export class DbtTextDocument {
  static readonly NON_WORD_PATTERN = /\W/;
  static readonly JINJA_PATTERN = /{{[\s\S]*?}}|{%[\s\S]*?%}|{#[\s\S]*?#}/g;

  connection: _Connection;
  rawDocument: TextDocument;
  compiledDocument: TextDocument;
  modelCompiler: ModelCompiler;
  ast: AnalyzeResponse | undefined;
  schemaTracker: SchemaTracker;
  jinjas = new Array<Range>();
  recompileRequired = false;
  catalogInitialized = false;

  constructor(doc: TextDocumentItem, dbtServer: DbtServer, connection: _Connection, serviceAccountCreds?: ServiceAccountCreds) {
    this.rawDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.compiledDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.modelCompiler = new ModelCompiler(this, dbtServer);
    this.connection = connection;
    this.schemaTracker = new SchemaTracker(serviceAccountCreds);

    this.findAllJinjas();
    // if (this.jinjas.length > 0) {
    this.modelCompiler.compile();
    // }
  }

  async didChangeTextDocument(params: DidChangeTextDocumentParams) {
    TextDocument.update(this.rawDocument, params.contentChanges, params.textDocument.version);
    // if (this.checkIfJinjaModified(changes)) {
    await this.modelCompiler.compile();
    // }
  }

  getLines() {
    return this.rawDocument.getText().split('\n');
  }

  getUri() {
    return this.rawDocument.uri;
  }

  getText(range?: Range) {
    return this.rawDocument.getText(range);
  }

  getFileName(): string {
    const lastSlash = this.rawDocument.uri.lastIndexOf('/');
    return this.rawDocument.uri.substring(lastSlash);
  }

  checkIfJinjaModified(changes: TextDocumentContentChangeEvent[]) {
    this.jinjas.forEach(jinjaRange => {
      changes.forEach((change: TextDocumentContentChangeEvent) => {
        if ('range' in change) {
          if (this.rangesOverlap(jinjaRange, change.range)) {
            return true;
          }
        }
      });
    });
    return false;
  }

  findAllJinjas() {
    this.jinjas = DbtTextDocument.findAllJinjas(this.rawDocument);
  }

  static findAllJinjas(rawDocument: TextDocument): Array<Range> {
    const text = rawDocument.getText();
    const jinjas = new Array<Range>();
    let m: RegExpExecArray | null;

    while ((m = DbtTextDocument.JINJA_PATTERN.exec(text))) {
      jinjas.push({
        start: rawDocument.positionAt(m.index),
        end: rawDocument.positionAt(m.index + m[0].length),
      });
    }
    return jinjas;
  }

  async sendDiagnostics(dbtCompilationError?: string) {
    if (dbtCompilationError) {
      const diagnostics: Diagnostic[] = [
        {
          severity: DiagnosticSeverity.Error,
          range: Range.create(0, 0, 0, 0),
          message: dbtCompilationError,
        },
      ];

      this.connection.sendDiagnostics({ uri: this.getUri(), diagnostics });
      return;
    }

    const analyzeRequest: AnalyzeRequest = {
      sqlStatement: this.compiledDocument.getText(),
      registeredCatalogId: ZetaSQLCatalog.getInstance().catalog.registeredId,
      options: {
        errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
        languageOptions: ZetaSQLCatalog.getInstance().catalog.builtinFunctionOptions.languageOptions,
      },
    };

    const diagnostics: Diagnostic[] = [];
    try {
      this.ast = await ZetaSQLClient.INSTANCE.analyze(analyzeRequest);
      console.log('AST was successfully received');
    } catch (e) {
      console.log('There was an error wile parsing SQL query');
      // Parse string like 'Unrecognized name: paused1; Did you mean paused? [at 9:3]'
      if (e.code == 3) {
        const matchResults = e.details.match(/(.*?) \[at (\d+):(\d+)\]/);
        const lineInCompiledDoc = matchResults[2] - 1;
        const characterInCompiledDoc = matchResults[3] - 1;
        const lineInRawDoc = DiffTracker.getOldLineNumber(this.rawDocument.getText(), this.compiledDocument.getText(), lineInCompiledDoc);
        let position = Position.create(lineInRawDoc, characterInCompiledDoc);
        const range = this.getIdentifierRangeAtPosition(position);

        const diagnostic: Diagnostic = {
          severity: DiagnosticSeverity.Error,
          range: range,
          message: matchResults[1],
        };
        diagnostics.push(diagnostic);
      }
    }
    this.connection.sendDiagnostics({ uri: this.getUri(), diagnostics });
  }

  rangesOverlap(range1: Range, range2: Range): boolean {
    return (range1.start < range2.start && range1.end > range2.start) || (range1.start < range2.end && range1.end > range2.end);
  }

  async ensureCatalogInitialized() {
    await this.schemaTracker.refreshTableNames(this.compiledDocument.getText());
    const projectId = this.schemaTracker.serviceAccountCreds?.project;
    if (projectId && this.schemaTracker.hasNewTables) {
      await this.registerCatalog();
    }
  }

  async registerCatalog() {
    await ZetaSQLCatalog.getInstance().register(this.schemaTracker.tableDefinitions);
    this.schemaTracker.resetHasNewTables();
  }

  async onCompilationFinished(dbtCompilationError?: string) {
    if (!dbtCompilationError) {
      await this.ensureCatalogInitialized();
    }
    await this.sendDiagnostics(dbtCompilationError);
  }

  async onHover(hoverParams: HoverParams): Promise<Hover | null> {
    const range = this.getIdentifierRangeAtPosition(hoverParams.position);
    const text = this.getText(range);
    return HoverProvider.hoverOnText(text, this.ast);
  }

  async onCompletion(сompletionParams: CompletionParams, destinationDefinition: DestinationDefinition): Promise<CompletionItem[]> {
    return CompletionProvider.onCompletion(сompletionParams, destinationDefinition);
  }

  getIdentifierRangeAtPosition(position: Position): Range {
    const lines = this.getLines();
    if (!lines) {
      return Range.create(position, position);
    }
    const line = Math.min(lines.length - 1, Math.max(0, position.line));
    const lineText = lines[line];
    const charIndex = Math.max(0, Math.min(lineText.length - 1, Math.max(0, position.character)));
    const textBeforeChar = lineText.substring(0, charIndex);
    if ((textBeforeChar.split('`').length - 1) % 2 !== 0) {
      return Range.create(line, textBeforeChar.lastIndexOf('`'), line, lineText.indexOf('`', charIndex) + 1);
    }
    if (lineText[charIndex] == '`') {
      return Range.create(line, charIndex, line, lineText.indexOf('`', charIndex + 1) + 1);
    }
    let startChar = charIndex;
    while (startChar > 0 && !DbtTextDocument.NON_WORD_PATTERN.test(lineText.charAt(startChar - 1))) {
      --startChar;
    }
    let endChar = charIndex;
    while (endChar < lineText.length && !DbtTextDocument.NON_WORD_PATTERN.test(lineText.charAt(endChar))) {
      ++endChar;
    }

    return startChar === endChar ? Range.create(position, position) : Range.create(line, startChar, line, endChar);
  }
}
