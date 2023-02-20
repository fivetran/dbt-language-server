import { Position, Range, Uri } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getDocUri, MAX_RANGE } from './helper';

suite('Definitions for columns', () => {
  test('Should suggest definitions for different columns', async () => {
    const docUri = getDocUri('column_navigation.sql');
    await activateAndWait(docUri);

    const tableExistsDoc = getDocUri('table_exists.sql');
    const currentTimeDoc = getDocUri('current_time_of_day.sql');
    const testTableSelectRange = new Range(3, 4, 5, 51);

    // Definition for column `email`
    await assertDefinitionsForColumn(docUri, new Position(8, 5), new Range(8, 4, 8, 9), docUri, new Range(1, 4, 1, 73));

    // Definition for column `one`
    await assertDefinitionsForColumn(docUri, new Position(8, 12), new Range(8, 11, 8, 14), docUri, testTableSelectRange);

    // Definition for column `id`
    await assertDefinitionsForColumn(docUri, new Position(9, 5), new Range(9, 4, 9, 6), tableExistsDoc, MAX_RANGE);

    // Definition for column `t.id`
    await assertDefinitionsForColumn(docUri, new Position(10, 5), new Range(10, 4, 10, 8), tableExistsDoc, MAX_RANGE);

    // Definition for column `test_table.two`
    await assertDefinitionsForColumn(docUri, new Position(11, 5), new Range(11, 4, 11, 18), docUri, testTableSelectRange);

    // Definition for column `test_table.dv`
    await assertDefinitionsForColumn(docUri, new Position(12, 5), new Range(12, 4, 12, 17), docUri, testTableSelectRange);

    // Definition for column `dv`
    await assertDefinitionsForColumn(docUri, new Position(13, 5), new Range(13, 4, 13, 6), docUri, testTableSelectRange);

    // Definition for column `now`
    await assertDefinitionsForColumn(docUri, new Position(14, 5), new Range(14, 4, 14, 7), currentTimeDoc, MAX_RANGE);

    // Definition for column `current_time_of_day.hour`
    await assertDefinitionsForColumn(docUri, new Position(15, 5), new Range(15, 4, 15, 28), currentTimeDoc, MAX_RANGE);
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
