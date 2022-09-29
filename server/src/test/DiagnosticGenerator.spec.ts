import { assertThat } from 'hamjest';
import { mock } from 'ts-mockito';
import { DiagnosticSeverity, Range } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { DiagnosticGenerator } from '../DiagnosticGenerator';

describe('DiagnosticGenerator', () => {
  const DIAGNOSTIC_GENERATOR = new DiagnosticGenerator(mock(DbtRepository));
  const MODEL_NAME = 'simple_select_dbt';
  const MODEL_PATH = `models/${MODEL_NAME}.sql`;
  const ERROR_LINE = 2;
  const DBT_ERROR = `Compilation Error in model ${MODEL_NAME} (${MODEL_PATH})\n  unexpected '}'\n    line ${ERROR_LINE}\n      select * from {{ var('project_name') }.dbt_ls_e2e_dataset.test_table1`;
  const WORKSPACE_FOLDER = '/Users/user/project';

  function shouldReturnDiagnosticWithoutLinks(
    currentModelPath: string,
    expectedMessage: string,
    expectedErrorLine: number,
    expectedUri?: string,
  ): void {
    const diagnostics = DIAGNOSTIC_GENERATOR.getDbtErrorDiagnostics(expectedMessage, currentModelPath, WORKSPACE_FOLDER);

    assertThat(diagnostics, [
      [
        {
          severity: DiagnosticSeverity.Error,
          range: Range.create(expectedErrorLine, 0, expectedErrorLine, DiagnosticGenerator.DBT_ERROR_HIGHLIGHT_LAST_CHAR),
          message: expectedMessage,
          source: DiagnosticGenerator.DIAGNOSTIC_SOURCE,
        },
      ],
      expectedUri,
    ]);
  }

  it('Should return diagnostic for current file', () => {
    shouldReturnDiagnosticWithoutLinks(MODEL_PATH, DBT_ERROR, ERROR_LINE - 1);
  });

  it('Should return diagnostic for current file highlight first line', () => {
    shouldReturnDiagnosticWithoutLinks(MODEL_PATH, 'RPC server failed to compile project', 0);
  });

  it('Should return diagnostic for another', () => {
    shouldReturnDiagnosticWithoutLinks('models/test.sql', DBT_ERROR, ERROR_LINE - 1, `file://${WORKSPACE_FOLDER}/${MODEL_PATH}`);
  });
});
