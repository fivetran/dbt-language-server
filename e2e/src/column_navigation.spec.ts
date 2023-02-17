import { Position, Range, Uri } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getDocUri, MAX_RANGE } from './helper';

suite('Definitions for columns', () => {
  test('Should suggest definitions for different columns', async () => {
    const docUri = getDocUri('column_navigation.sql');
    await activateAndWait(docUri);

    const tableExistsDoc = getDocUri('table_exists.sql');
    const testTableSelectRange = new Range(3, 4, 4, 12);

    // Definition for column `email`
    await assertDefinitionsForColumn(docUri, new Position(7, 5), new Range(7, 4, 7, 9), docUri, new Range(1, 4, 1, 73));

    // Definition for column `one`
    await assertDefinitionsForColumn(docUri, new Position(7, 12), new Range(7, 11, 7, 14), docUri, testTableSelectRange);

    // Definition for column `id`
    await assertDefinitionsForColumn(docUri, new Position(8, 5), new Range(8, 4, 8, 6), tableExistsDoc, MAX_RANGE);

    // Definition for column `t.id`
    await assertDefinitionsForColumn(docUri, new Position(9, 5), new Range(9, 4, 9, 8), tableExistsDoc, MAX_RANGE);

    // Definition for column `test_table.two`
    await assertDefinitionsForColumn(docUri, new Position(10, 5), new Range(10, 4, 10, 18), docUri, testTableSelectRange);
  });
});

function assertDefinitionsForColumn(
  docUri: Uri,
  clickPosition: Position,
  originSelectionRange: Range,
  targetUri: Uri,
  targetRange: Range,
): Promise<void> {
  return assertDefinitions(docUri, clickPosition, [
    {
      originSelectionRange,
      targetUri,
      targetRange,
      targetSelectionRange: targetRange,
    },
  ]);
}
