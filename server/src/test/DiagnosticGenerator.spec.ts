import { assertThat } from 'hamjest';
import { mock } from 'ts-mockito';
import { DiagnosticSeverity, Location, Range } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { DiagnosticGenerator } from '../DiagnosticGenerator';

describe('DiagnosticGenerator', () => {
  const DIAGNOSTIC_GENERATOR = new DiagnosticGenerator(mock(DbtRepository));
  const MODEL_NAME = 'simple_select_dbt';
  const MODEL_PATH = `models/${MODEL_NAME}.sql`;
  const ERROR_LINE = 2;
  const DBT_ERROR = `RPC server failed to compile project, call the "status" method for compile status: Compilation Error in model ${MODEL_NAME} (${MODEL_PATH})\n  unexpected '}'\n    line ${ERROR_LINE}\n      select * from {{ var('project_name') }.dbt_ls_e2e_dataset.test_table1`;
  const WORKSPACE_FOLDER = '/Users/user/project';

  function shouldReturnDiagnosticWithoutLinks(error: string, errorLine: number): void {
    const diagnostics = DIAGNOSTIC_GENERATOR.getDbtErrorDiagnostics(error, MODEL_PATH, WORKSPACE_FOLDER);

    assertThat(diagnostics, [
      {
        severity: DiagnosticSeverity.Error,
        range: Range.create(errorLine, 0, errorLine, DiagnosticGenerator.DBT_ERROR_HIGHLIGHT_LAST_CHAR),
        message: error,
        relatedInformation: [],
      },
    ]);
  }

  it('Should return diagnostic for current file without links', () => {
    shouldReturnDiagnosticWithoutLinks(DBT_ERROR, ERROR_LINE - 1);
  });

  it('Should return diagnostic for another file with link and highlight first line', () => {
    shouldReturnDiagnosticWithoutLinks('RPC server failed to compile project', 0);
  });

  it('Should return diagnostic for another file with link', () => {
    const diagnostics = DIAGNOSTIC_GENERATOR.getDbtErrorDiagnostics(DBT_ERROR, 'models/test.sql', WORKSPACE_FOLDER);

    assertThat(diagnostics, [
      {
        severity: DiagnosticSeverity.Error,
        range: Range.create(0, 0, 0, DiagnosticGenerator.DBT_ERROR_HIGHLIGHT_LAST_CHAR),
        message: DiagnosticGenerator.ERROR_IN_OTHER_FILE,
        relatedInformation: [
          {
            location: Location.create(
              `${WORKSPACE_FOLDER}/${MODEL_PATH}`,
              Range.create(ERROR_LINE - 1, 0, ERROR_LINE - 1, DiagnosticGenerator.DBT_ERROR_HIGHLIGHT_LAST_CHAR),
            ),
            message: "Compilation Error in model simple_select_dbt (models/simple_select_dbt.sql)\n  unexpected '}'",
          },
        ],
      },
    ]);
  });
});
