import { DiagnosticSeverity, Location, Range } from 'vscode';
import { assertDiagnostics } from './asserts';
import { activateAndWait, getDocUri, replaceText } from './helper';

suite('Should show dbt error and link to it', () => {
  const DOC_WITH_ERROR = getDocUri('package_ref.sql');
  const DOC_WITHOUT_ERROR = getDocUri('ref_sql.sql');

  const ORIGINAL_LINE = "from {{ source('new_project', 'users') }} u";
  const LINE_WITH_ERROR = "from {{ source('new_project', 'users') } u";

  const ERROR_IN_CURRENT_FILE = `RPC server failed to compile project, call the "status" method for compile status: Compilation Error in model package_ref (models/package_ref.sql)\n  unexpected '}'\n    line 5\n      from {{ source('new_project', 'users') } u`;
  const ERROR_IN_OTHER_FILE = 'Error in other file';
  const MESSAGE_AFTER_LINK = `Compilation Error in model package_ref (models/package_ref.sql)\n  unexpected '}'`;

  const DBT_ERROR_HIGHLIGHT_LAST_CHAR = 100;

  const ERROR_LINE = 4;

  test('Should show dbt error and link to it', async () => {
    await activateAndWait(DOC_WITH_ERROR);
    await replaceText(ORIGINAL_LINE, LINE_WITH_ERROR);

    await assertDiagnostics(DOC_WITH_ERROR, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(ERROR_LINE, 0, ERROR_LINE, DBT_ERROR_HIGHLIGHT_LAST_CHAR),
        message: ERROR_IN_CURRENT_FILE,
        relatedInformation: [],
      },
    ]);

    await activateAndWait(DOC_WITHOUT_ERROR);

    await assertDiagnostics(DOC_WITHOUT_ERROR, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, DBT_ERROR_HIGHLIGHT_LAST_CHAR),
        message: ERROR_IN_OTHER_FILE,
        relatedInformation: [
          {
            location: new Location(DOC_WITH_ERROR, new Range(ERROR_LINE, 0, ERROR_LINE, DBT_ERROR_HIGHLIGHT_LAST_CHAR)),
            message: MESSAGE_AFTER_LINK,
          },
        ],
      },
    ]);

    await activateAndWait(DOC_WITH_ERROR);
    await replaceText(LINE_WITH_ERROR, ORIGINAL_LINE);

    await assertDiagnostics(DOC_WITH_ERROR, []);
    await assertDiagnostics(DOC_WITHOUT_ERROR, []);
  });
});
