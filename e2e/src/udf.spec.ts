import { DiagnosticSeverity, Position, Range } from 'vscode';
import { assertDiagnostics } from './asserts';
import { activateAndWait, appendText, getDocUri } from './helper';

suite('User defined function', () => {
  const DOC_URI = getDocUri('udf.sql');

  test('Should compile sql with UDF', async () => {
    await activateAndWait(DOC_URI);

    await assertDiagnostics(DOC_URI, []);

    await appendText(' + dbt_ls_e2e_dataset.my_custom_sum1(1, 2)');
    await assertDiagnostics(DOC_URI, [
      {
        severity: DiagnosticSeverity.Error,
        message: 'Function not found: dbt_ls_e2e_dataset.my_custom_sum1; Did you mean dbt_ls_e2e_dataset.my_custom_sum?',
        range: new Range(new Position(2, 68), new Position(2, 86)),
      },
    ]);
  });
});
