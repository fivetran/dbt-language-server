import { Diagnostic, DiagnosticSeverity, Range } from 'vscode';
import { assertDiagnostics } from './asserts';
import { activateAndWait, getDocUri, replaceText } from './helper';

suite('Recursive search', () => {
  const RECURSIVE_SEARCH_DOC_URI = getDocUri('recursive_search.sql');
  const TABLE_DOES_NOT_EXIST_DOC_URI = getDocUri('table_does_not_exist.sql');

  test('Should search model recursively if it is not found in BigQuery', async () => {
    await activateAndWait(RECURSIVE_SEARCH_DOC_URI);

    await assertDiagnostics(RECURSIVE_SEARCH_DOC_URI, []);
  });

  test('Should register created columns', async () => {
    await activateAndWait(TABLE_DOES_NOT_EXIST_DOC_URI);
    await replaceText('1 as id', '1 as id, 2 as amount');

    await activateAndWait(RECURSIVE_SEARCH_DOC_URI);
    await replaceText('*', 's.amount');

    await assertDiagnostics(RECURSIVE_SEARCH_DOC_URI, []);
  });

  test('Should unregister deleted columns', async () => {
    await activateAndWait(TABLE_DOES_NOT_EXIST_DOC_URI);
    await replaceText(', 2 as amount', '');

    await activateAndWait(RECURSIVE_SEARCH_DOC_URI);
    await replaceText('s.amount', 's.amount + 2');

    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Information,
      range: new Range(0, 9, 0, 15),
      message: 'Name amount not found inside s',
    };

    await assertDiagnostics(RECURSIVE_SEARCH_DOC_URI, [diagnostic]);
  });
});
