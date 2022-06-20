import { assertDiagnostics } from './asserts';
import { activateAndWait, getDocUri } from './helper';

suite('Recursive search', () => {
  const DOC_URI = getDocUri('recursive_search.sql');

  test('Should search model recursively if it is not found in BigQuery', async () => {
    await activateAndWait(DOC_URI);

    await assertDiagnostics(DOC_URI, []);
  });
});
