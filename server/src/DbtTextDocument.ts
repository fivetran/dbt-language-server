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
  TextDocumentContentChangeEvent,
  TextDocumentItem,
  _Connection,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionProvider } from './CompletionProvider';
import { DbtServer } from './DbtServer';
import { DestinationDefinition } from './DestinationDefinition';
import { DiffTracker } from './DiffTracker';
import { HoverProvider } from './HoverProvider';
import { JinjaParser } from './JinjaParser';
import { ModelCompiler } from './ModelCompiler';
import { SchemaTracker } from './SchemaTracker';
import { ServiceAccountCreds } from './YamlParser';
import { ZetaSQLAST } from './ZetaSQLAST';
import { ZetaSQLCatalog } from './ZetaSQLCatalog';

export class DbtTextDocument {
  static readonly NON_WORD_PATTERN = /\W/;

  static zetaSQLAST = new ZetaSQLAST();
  static jinjaParser = new JinjaParser();

  connection: _Connection;
  rawDocument: TextDocument;
  compiledDocument: TextDocument;
  modelCompiler: ModelCompiler;
  ast: AnalyzeResponse | undefined;
  schemaTracker: SchemaTracker;
  catalogInitialized = false;
  compilationInProgress = false;

  constructor(doc: TextDocumentItem, dbtServer: DbtServer, connection: _Connection, serviceAccountCreds?: ServiceAccountCreds) {
    this.rawDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.compiledDocument = TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text);
    this.modelCompiler = new ModelCompiler(this, dbtServer);
    this.connection = connection;
    this.schemaTracker = new SchemaTracker(serviceAccountCreds);
  }

  async didChangeTextDocument(params: DidChangeTextDocumentParams) {
    if (this.isDbtCompileNeeded(params.contentChanges)) {
      this.compilationInProgress = true;
      TextDocument.update(this.rawDocument, params.contentChanges, params.textDocument.version);
      await this.debouncedCompile();
    } else {
      const compiledContentChanges = params.contentChanges.map(c => {
        if (!TextDocumentContentChangeEvent.isIncremental(c)) {
          throw new Error('Incremental updates expected');
        }

        return <TextDocumentContentChangeEvent>{
          text: c.text,
          range: Range.create(
            this.convertPosition(this.compiledDocument.getText(), this.rawDocument.getText(), c.range.start),
            this.convertPosition(this.compiledDocument.getText(), this.rawDocument.getText(), c.range.end),
          ),
        };
      });
      TextDocument.update(this.rawDocument, params.contentChanges, params.textDocument.version);
      TextDocument.update(this.compiledDocument, compiledContentChanges, params.textDocument.version);
      await this.onCompilationFinished();
    }
  }

  convertPosition(first: string, second: string, positionInSecond: Position): Position {
    const lineInFirst = DiffTracker.getOldLineNumber(first, second, positionInSecond.line);
    return {
      line: lineInFirst,
      character: positionInSecond.character,
    };
  }

  isDbtCompileNeeded(changes: TextDocumentContentChangeEvent[]) {
    const firstRun = changes.length === 0;
    if (this.compilationInProgress || firstRun) {
      return true;
    }

    const jinjas = DbtTextDocument.jinjaParser.findAllJinjas(this.rawDocument);
    return jinjas.length > 0 && DbtTextDocument.jinjaParser.checkIfJinjaModified(jinjas, changes);
  }

  debouncedCompile = this.debounce(async () => {
    await this.modelCompiler.compile();
  }, 300);

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
        parseLocationOptions: {
          recordParseLocations: true,
        },
        errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
        languageOptions: ZetaSQLCatalog.getInstance().catalog.builtinFunctionOptions.languageOptions,
      },
    };

    const diagnostics: Diagnostic[] = [];
    try {
      this.ast = await ZetaSQLClient.INSTANCE.analyze(analyzeRequest);
      console.log('AST was successfully received');
    } catch (e: any) {
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

  comparePositions(position1: Position, position2: Position): number {
    if (position1.line < position2.line) return -1;
    if (position1.line > position2.line) return 1;

    if (position1.character < position2.character) return -1;
    if (position1.character > position2.character) return 1;

    return 0;
  }

  async ensureCatalogInitialized() {
    await this.schemaTracker.refreshTableNames(this.compiledDocument.getText());
    const projectId = this.schemaTracker.serviceAccountCreds?.project;
    if (projectId && (this.schemaTracker.hasNewTables || !ZetaSQLCatalog.getInstance().isRegistered())) {
      await this.registerCatalog();
    }
  }

  async registerCatalog() {
    await ZetaSQLCatalog.getInstance().register(this.schemaTracker.tableDefinitions);
    this.schemaTracker.resetHasNewTables();
  }

  async onCompilationFinished(dbtCompilationError?: string) {
    this.compilationInProgress = false;
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
    const text = this.getText(this.getIdentifierRangeAtPosition(сompletionParams.position));
    let completionInfo;
    if (this.ast) {
      const line = DiffTracker.getOldLineNumber(this.compiledDocument.getText(), this.rawDocument.getText(), сompletionParams.position.line);
      const offset = this.compiledDocument.offsetAt(Position.create(line, сompletionParams.position.character));
      completionInfo = DbtTextDocument.zetaSQLAST.getCompletionInfo(this.ast, offset);
    }
    return CompletionProvider.onCompletion(text, сompletionParams, destinationDefinition, completionInfo);
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

  debounce(callback: () => any, delay: number) {
    let timeout: NodeJS.Timeout;
    return function () {
      clearTimeout(timeout);
      timeout = setTimeout(callback, delay);
    };
  }
}
