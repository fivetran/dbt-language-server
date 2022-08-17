import { Diagnostic, DiagnosticSeverity, Range } from 'vscode';
import { assertDiagnostics } from './asserts';
import { activateAndWait, getDocUri, replaceText } from './helper';

suite('Recursive search', () => {
  const RECURSIVE_SEARCH_DOC_URI = getDocUri('recursive_search.sql');
  const TABLE_DOES_NOT_EXIST_DOC_URI = getDocUri('table_does_not_exist.sql');
  const CURRENT_TIME_OF_DAY_DOC_URI = getDocUri('current_time_of_day.sql');
  const CURRENT_TIME_DOC_URI = getDocUri('current_time.sql');

  test('Should search model recursively if it is not found in BigQuery', async () => {
    await activateAndWait(RECURSIVE_SEARCH_DOC_URI);

    await assertDiagnostics(RECURSIVE_SEARCH_DOC_URI, []);
  });

  test('Should register created columns', async () => {
    await activateAndWait(TABLE_DOES_NOT_EXIST_DOC_URI);
    await replaceText('1 as id', '1 as id, 2 as amount, dbt_ls_e2e_dataset.my_custom_sum(1, 2) as udf_result');

    await activateAndWait(RECURSIVE_SEARCH_DOC_URI);
    await replaceText('*', 's.amount');

    await assertDiagnostics(RECURSIVE_SEARCH_DOC_URI, []);
  });

  test('Should unregister deleted columns', async () => {
    await activateAndWait(CURRENT_TIME_DOC_URI);
    await replaceText('EXTRACT(HOUR FROM CURRENT_TIME()) as hour, ', '');
    await activateAndWait(CURRENT_TIME_OF_DAY_DOC_URI);

    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Information,
      range: new Range(19, 61, 19, 65),
      message: 'Name hour not found inside ct',
    };

    await assertDiagnostics(CURRENT_TIME_OF_DAY_DOC_URI, [diagnostic]);
  });
});
