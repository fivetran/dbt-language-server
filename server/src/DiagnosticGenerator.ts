import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import * as path from 'node:path';
import { Diagnostic, DiagnosticSeverity, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { DbtRepository } from './DbtRepository';
import { PositionConverter } from './PositionConverter';
import { AnalyzeResult } from './ProjectAnalyzer';
import { SqlRefConverter } from './SqlRefConverter';
import { DbtTextDocument } from './document/DbtTextDocument';
import { DIAGNOSTIC_SOURCE } from './utils/Constants';
import { getIdentifierRangeAtPosition } from './utils/Utils';

interface RawAndCompiledDiagnostics {
  raw: Diagnostic[];
  compiled: Diagnostic[];
}

export interface SqlToRefData {
  replaceText: string;
}

export class DiagnosticGenerator {
  private static readonly DBT_ERROR_LINE_PATTERN = /\n\s*line (\d+)\s*\n/;
  private static readonly DBT_COMPILATION_ERROR_PATTERN = /(Error in model \w+ \((.*)\)(?:\r\n?|\n).*)(?:\r\n?|\n)/;
  private static readonly SQL_COMPILATION_ERROR_PATTERN = /(.*?) \[at (\d+):(\d+)\]/;

  private static readonly AUTH_ERROR_PATTERN = /Reauthentication is needed. Please run .* to reauthenticate\./;

  static readonly DBT_ERROR_HIGHLIGHT_LAST_CHAR = 100;

  private sqlRefConverter = new SqlRefConverter();

  constructor(private dbtRepository: DbtRepository) {}

  getDbtErrorDiagnostics(dbtCompilationError: string): [Diagnostic[], string | undefined] {
    let errorLine = 0;
    const lineMatch = dbtCompilationError.match(DiagnosticGenerator.DBT_ERROR_LINE_PATTERN);
    if (lineMatch && lineMatch.length > 1) {
      errorLine = Number(lineMatch[1]) - 1;
    }

    const errorMatch = dbtCompilationError.match(DiagnosticGenerator.AUTH_ERROR_PATTERN);
    const message = errorMatch ? errorMatch[0] : dbtCompilationError;

    const fileUri = this.getFileUri(dbtCompilationError);

    return [
      [
        {
          severity: DiagnosticSeverity.Error,
          range: this.getDbtErrorRange(errorLine),
          message,
          source: DIAGNOSTIC_SOURCE,
        },
      ],
      fileUri,
    ];
  }

  getDiagnosticsFromAst(analyzeResult: AnalyzeResult, rawDocument: TextDocument, compiledDocument: TextDocument): RawAndCompiledDiagnostics {
    let result: RawAndCompiledDiagnostics = { raw: [], compiled: [] };
    analyzeResult.ast.match(
      ast => {
        result = this.createInformationDiagnostics(ast, rawDocument, compiledDocument);
      },
      error => {
        result = this.getSqlErrorDiagnostics(error, rawDocument.getText(), compiledDocument.getText());
      },
    );

    return result;
  }

  getSqlErrorDiagnostics(error: string, rawDocText: string, compiledDocText: string): RawAndCompiledDiagnostics {
    const result: RawAndCompiledDiagnostics = { raw: [], compiled: [] };
    // Parse string like 'Unrecognized name: paused1; Did you mean paused? [at 9:3]'
    const matchResults = error.match(DiagnosticGenerator.SQL_COMPILATION_ERROR_PATTERN);
    if (matchResults) {
      const [, errorText] = matchResults;
      const lineInCompiledDoc = Number(matchResults[2]) - 1;
      const characterInCompiledDoc = Number(matchResults[3]) - 1;

      const positionInCompiledDoc = Position.create(lineInCompiledDoc, characterInCompiledDoc);
      const positionInRawDoc = new PositionConverter(rawDocText, compiledDocText).convertPositionBackward(positionInCompiledDoc);

      result.raw.push(this.createErrorDiagnostic(rawDocText, positionInRawDoc, errorText));
      result.compiled.push(this.createErrorDiagnostic(compiledDocText, positionInCompiledDoc, errorText));
    }
    return result;
  }

  private createInformationDiagnostics(
    ast: AnalyzeResponse__Output,
    rawDocument: TextDocument,
    compiledDocument: TextDocument,
  ): RawAndCompiledDiagnostics {
    const result: RawAndCompiledDiagnostics = { raw: [], compiled: [] };

    const rawText = rawDocument.getText();
    const compiledText = compiledDocument.getText();

    const resolvedTables = DbtTextDocument.ZETA_SQL_AST.getResolvedTables(ast, compiledText);
    const changes = this.sqlRefConverter.sqlToRef(compiledDocument, resolvedTables, this.dbtRepository.dag);

    const converter = new PositionConverter(rawText, compiledText);
    for (const change of changes) {
      const range = Range.create(converter.convertPositionBackward(change.range.start), converter.convertPositionBackward(change.range.end));

      if (rawDocument.getText(range) === compiledDocument.getText(change.range)) {
        result.raw.push(this.createInformationDiagnostic(range, change.newText));
      }
    }
    return result;
  }

  private createInformationDiagnostic(range: Range, newText: string): Diagnostic {
    const data: SqlToRefData = { replaceText: newText };
    return {
      severity: DiagnosticSeverity.Information,
      range,
      message: 'Reference to dbt model is not a ref',
      data,
      source: DIAGNOSTIC_SOURCE,
    };
  }

  private getFileUri(dbtCompilationError: string): string | undefined {
    const match = dbtCompilationError.match(DiagnosticGenerator.DBT_COMPILATION_ERROR_PATTERN);
    if (match && match.length > 2) {
      const modelPath = match[2];
      return URI.file(path.join(this.dbtRepository.projectPath, modelPath)).toString();
    }
    return undefined;
  }

  private createErrorDiagnostic(docText: string, position: Position, message: string): Diagnostic {
    const range = this.extendRangeIfSmall(getIdentifierRangeAtPosition(position, docText));
    return {
      severity: DiagnosticSeverity.Error,
      range,
      message,
      source: DIAGNOSTIC_SOURCE,
    };
  }

  private extendRangeIfSmall(range: Range): Range {
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
