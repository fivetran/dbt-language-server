import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { Result } from 'neverthrow';
import { Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Location, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtRepository } from './DbtRepository';
import { DbtTextDocument } from './document/DbtTextDocument';
import { PositionConverter } from './PositionConverter';
import { SqlRefConverter } from './SqlRefConverter';
import { DiffUtils } from './utils/DiffUtils';
import { getIdentifierRangeAtPosition } from './utils/Utils';
import path = require('path');

export class DiagnosticGenerator {
  private static readonly DBT_ERROR_LINE_PATTERN = /\n\s*line (\d+)\s*\n/;
  private static readonly DBT_COMPILATION_ERROR_PATTERN = /(Compilation Error in model \w+ \((.*)\)\n.*)\n/;
  private static readonly SQL_COMPILATION_ERROR_PATTERN = /(.*?) \[at (\d+):(\d+)\]/;

  static readonly ERROR_IN_OTHER_FILE = 'Error in other file';

  static readonly DBT_ERROR_HIGHLIGHT_LAST_CHAR = 100;

  private sqlRefConverter = new SqlRefConverter();

  constructor(private dbtRepository: DbtRepository) {}

  getDbtErrorDiagnostics(dbtCompilationError: string, currentModelPath: string, workspaceFolder: string): Diagnostic[] {
    let errorLine = 0;
    const lineMatch = dbtCompilationError.match(DiagnosticGenerator.DBT_ERROR_LINE_PATTERN);
    if (lineMatch && lineMatch.length > 1) {
      errorLine = Number(lineMatch[1]) - 1;
    }

    const relatedInformation = this.getDbtRelatedInformation(dbtCompilationError, currentModelPath, workspaceFolder, errorLine);

    return [
      {
        severity: DiagnosticSeverity.Error,
        range: this.getDbtErrorRange(relatedInformation.length > 0 ? 0 : errorLine),
        message: relatedInformation.length > 0 ? DiagnosticGenerator.ERROR_IN_OTHER_FILE : dbtCompilationError,
        relatedInformation,
      },
    ];
  }

  getDiagnosticsFromAst(
    astResult: Result<AnalyzeResponse__Output, string>,
    rawDocument: TextDocument,
    compiledDocument: TextDocument,
  ): Diagnostic[][] {
    const rawDocDiagnostics: Diagnostic[] = [];
    const compiledDocDiagnostics: Diagnostic[] = [];

    astResult.match(
      ast => this.createInformationDiagnostics(ast, rawDocument, compiledDocument, rawDocDiagnostics),
      error => this.createErrorDiagnostics(error, rawDocument.getText(), compiledDocument.getText(), rawDocDiagnostics, compiledDocDiagnostics),
    );

    return [rawDocDiagnostics, compiledDocDiagnostics];
  }

  createErrorDiagnostics(
    error: string,
    rawDocText: string,
    compiledDocText: string,
    rawDocDiagnostics: Diagnostic[],
    compiledDocDiagnostics: Diagnostic[],
  ): void {
    // Parse string like 'Unrecognized name: paused1; Did you mean paused? [at 9:3]'
    const matchResults = error.match(DiagnosticGenerator.SQL_COMPILATION_ERROR_PATTERN);
    if (matchResults) {
      const [, errorText] = matchResults;
      const lineInCompiledDoc = Number(matchResults[2]) - 1;
      const characterInCompiledDoc = Number(matchResults[3]) - 1;
      const lineInRawDoc = DiffUtils.getOldLineNumber(rawDocText, compiledDocText, lineInCompiledDoc);

      rawDocDiagnostics.push(this.createErrorDiagnostic(rawDocText, lineInRawDoc, characterInCompiledDoc, errorText));
      compiledDocDiagnostics.push(this.createErrorDiagnostic(compiledDocText, lineInCompiledDoc, characterInCompiledDoc, errorText));
    }
  }

  createInformationDiagnostics(
    ast: AnalyzeResponse__Output,
    rawDocument: TextDocument,
    compiledDocument: TextDocument,
    rawDocDiagnostics: Diagnostic[],
  ): void {
    const rawText = rawDocument.getText();
    const compiledText = compiledDocument.getText();

    const resolvedTables = DbtTextDocument.ZETA_SQL_AST.getResolvedTables(ast, compiledText);
    const changes = this.sqlRefConverter.sqlToRef(compiledDocument, resolvedTables, this.dbtRepository.models);

    const converter = new PositionConverter(rawText, compiledText);
    for (const change of changes) {
      const range = Range.create(converter.convertPositionBackward(change.range.start), converter.convertPositionBackward(change.range.end));

      if (rawDocument.getText(range) === compiledDocument.getText(change.range)) {
        rawDocDiagnostics.push(this.createInformationDiagnostic(range, change.newText));
      }
    }
  }

  createInformationDiagnostic(range: Range, newText: string): Diagnostic {
    return {
      severity: DiagnosticSeverity.Information,
      range,
      message: 'Reference to dbt model is not a ref',
      data: { replaceText: newText },
      source: 'dbt Wizard',
    };
  }

  private getDbtRelatedInformation(
    dbtCompilationError: string,
    currentModelPath: string,
    workspaceFolder: string,
    errorLine: number,
  ): DiagnosticRelatedInformation[] {
    if (!dbtCompilationError.includes(currentModelPath)) {
      const match = dbtCompilationError.match(DiagnosticGenerator.DBT_COMPILATION_ERROR_PATTERN);
      if (match && match.length > 2) {
        const [, error, modelPath] = match;
        return [
          {
            location: Location.create(path.join(workspaceFolder, modelPath), this.getDbtErrorRange(errorLine)),
            message: error,
          },
        ];
      }
    }
    return [];
  }

  private createErrorDiagnostic(docText: string, line: number, character: number, message: string): Diagnostic {
    const position = Position.create(line, character);
    const range = this.extendRangeIfSmall(getIdentifierRangeAtPosition(position, docText));
    return {
      severity: DiagnosticSeverity.Error,
      range,
      message,
    };
  }

  extendRangeIfSmall(range: Range): Range {
    if (range.start.line === range.end.line && range.end.character === range.start.character + 1) {
      if (range.start.character > 0) {
        range.start.character -= 1;
      }
      range.end.character += 1;
    }
    return range;
  }

  private getDbtErrorRange(errorLine: number): Range {
    return Range.create(errorLine, 0, errorLine, DiagnosticGenerator.DBT_ERROR_HIGHLIGHT_LAST_CHAR);
  }
}
