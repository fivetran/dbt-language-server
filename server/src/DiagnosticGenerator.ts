import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { Result } from 'neverthrow';
import { Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Location, Position, Range } from 'vscode-languageserver';
import { Diff } from './Diff';
import { getIdentifierRangeAtPosition } from './utils/Utils';
import path = require('path');

export class DiagnosticGenerator {
  private static readonly DBT_ERROR_LINE_PATTERN = /\n\s*line (\d+)\s*\n/;
  private static readonly DBT_COMPILATION_ERROR_PATTERN = /(Compilation Error in model \w+ \((.*)\)\n.*)\n/;
  private static readonly SQL_COMPILATION_ERROR_PATTERN = /(.*?) \[at (\d+):(\d+)\]/;

  static readonly ERROR_IN_OTHER_FILE = 'Error in other file';

  static readonly DBT_ERROR_HIGHLIGHT_LAST_CHAR = 100;

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

  getDiagnosticsFromAst(astResult: Result<AnalyzeResponse__Output, string>, rawDocText: string, compiledDocText: string): Diagnostic[][] {
    const rawDocDiagnostics: Diagnostic[] = [];
    const compiledDocDiagnostics: Diagnostic[] = [];

    if (astResult.isErr()) {
      // Parse string like 'Unrecognized name: paused1; Did you mean paused? [at 9:3]'
      const matchResults = astResult.error.match(DiagnosticGenerator.SQL_COMPILATION_ERROR_PATTERN);
      if (matchResults) {
        const [, errorText] = matchResults;
        const lineInCompiledDoc = Number(matchResults[2]) - 1;
        const characterInCompiledDoc = Number(matchResults[3]) - 1;
        const lineInRawDoc = Diff.getOldLineNumber(rawDocText, compiledDocText, lineInCompiledDoc);

        rawDocDiagnostics.push(this.createDiagnostic(rawDocText, lineInRawDoc, characterInCompiledDoc, errorText));
        compiledDocDiagnostics.push(this.createDiagnostic(compiledDocText, lineInCompiledDoc, characterInCompiledDoc, errorText));
      }
    }
    return [rawDocDiagnostics, compiledDocDiagnostics];
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

  private createDiagnostic(docText: string, line: number, character: number, message: string): Diagnostic {
    const position = Position.create(line, character);
    const range = getIdentifierRangeAtPosition(position, docText);
    return {
      severity: DiagnosticSeverity.Error,
      range,
      message,
    };
  }

  private getDbtErrorRange(errorLine: number): Range {
    return Range.create(errorLine, 0, errorLine, DiagnosticGenerator.DBT_ERROR_HIGHLIGHT_LAST_CHAR);
  }
}
