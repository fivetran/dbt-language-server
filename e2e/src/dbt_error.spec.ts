import { EOL } from 'node:os';
import * as path from 'node:path';
import { DiagnosticSeverity, Location, Range } from 'vscode';
import { assertAllDiagnostics } from './asserts';
import { activateAndWait, getDocUri, replaceText } from './helper';

suite('Should show dbt error and link to it', () => {
  const DOC_WITH_ERROR = getDocUri('package_ref.sql');
  const DOC_WITHOUT_ERROR = getDocUri('ref_sql.sql');

  const ORIGINAL_LINE = "from {{ source('new_project', 'users') }} u";
  const LINE_WITH_ERROR = "from {{ source('new_project', 'users') } u";

  const ERROR_IN_CURRENT_FILE = `Compilation Error in model package_ref (models${path.sep}package_ref.sql)${EOL}  unexpected '}'${EOL}    line 5${EOL}      from {{ source('new_project', 'users') } u`;
  const ERROR_IN_OTHER_FILE = 'Error in other file';
  const MESSAGE_AFTER_LINK = `Compilation Error in model package_ref (models${path.sep}package_ref.sql)${EOL}  unexpected '}'`;

  const DBT_ERROR_HIGHLIGHT_LAST_CHAR = 100;

  const ERROR_LINE = 4;

  test('Should show dbt error with link to it and clear error after fix', async () => {
    // 1. Should show error after changing text
    await activateAndWait(DOC_WITH_ERROR);
    await replaceText(ORIGINAL_LINE, LINE_WITH_ERROR);

    await assertAllDiagnostics(DOC_WITH_ERROR, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(ERROR_LINE, 0, ERROR_LINE, DBT_ERROR_HIGHLIGHT_LAST_CHAR),
        message: ERROR_IN_CURRENT_FILE,
        relatedInformation: [],
      },
    ]);

    // 2. Should show error with link to another document
    await activateAndWait(DOC_WITHOUT_ERROR);

    await assertAllDiagnostics(DOC_WITHOUT_ERROR, [
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

    // 3. Should clear diagnostics for both documents
    await activateAndWait(DOC_WITH_ERROR);
    await replaceText(LINE_WITH_ERROR, ORIGINAL_LINE);

    await assertAllDiagnostics(DOC_WITH_ERROR, []);
    await assertAllDiagnostics(DOC_WITHOUT_ERROR, []);
  });
});
