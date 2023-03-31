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
  const AUTH_ERROR_MAIN_PART = 'Reauthentication is needed. Please run `gcloud auth login --update-adc` to reauthenticate.';
  const AUTH_ERROR = `11:03:41  Running with dbt=1.4.5
  11:03:41  Found 23 models, 2 tests, 0 snapshots, 0 analyses, 340 macros, 0 operations, 0 seed files, 1 source, 0 exposures, 0 metrics
  11:03:41
  11:03:43  Encountered an error:${AUTH_ERROR_MAIN_PART}11:03:43  Traceback (most recent call last):`;
  const WORKSPACE_FOLDER = '/Users/user/project';

  function shouldReturnDbtDiagnostics(rawMessage: string, expectedMessage: string, expectedErrorLine: number, expectedUri?: string): void {
    const diagnostics = DIAGNOSTIC_GENERATOR.getDbtErrorDiagnostics(rawMessage, WORKSPACE_FOLDER);

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

  it('Should return diagnostic for file', () => {
    shouldReturnDbtDiagnostics(DBT_ERROR, DBT_ERROR, ERROR_LINE - 1, `file://${WORKSPACE_FOLDER}/${MODEL_PATH}`);
  });

  it('Should return diagnostic for current file highlight first line', () => {
    const message = 'RPC server failed to compile project';
    shouldReturnDbtDiagnostics(message, message, 0);
  });

  it('Should improve auth error', () => {
    shouldReturnDbtDiagnostics(AUTH_ERROR, AUTH_ERROR_MAIN_PART, 0);
  });
});
