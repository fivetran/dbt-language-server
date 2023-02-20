import { Position, Range, Uri } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getDocUri, MAX_RANGE } from './helper';

suite('Definitions for columns', () => {
  test('Should suggest definitions for different columns', async () => {
    const docUri = getDocUri('column_navigation.sql');
    await activateAndWait(docUri);

    const tableExistsDoc = getDocUri('table_exists.sql');
    const currentTimeDoc = getDocUri('current_time_of_day.sql');
    const usersTableSelectRange = new Range(1, 4, 1, 73);
    const testTableSelectRange = new Range(3, 4, 5, 51);

    // For query_from_other_with
    await assertDefinitionsForColumn('tt.one', docUri, new Position(8, 5), new Range(8, 4, 8, 10), docUri, testTableSelectRange);
    await assertDefinitionsForColumn('tt.dv', docUri, new Position(9, 5), new Range(9, 4, 9, 9), docUri, testTableSelectRange);
    await assertDefinitionsForColumn('dv', docUri, new Position(10, 5), new Range(10, 4, 10, 6), docUri, testTableSelectRange);
    await assertDefinitionsForColumn('tt.two', docUri, new Position(11, 5), new Range(11, 4, 11, 10), docUri, testTableSelectRange);
    await assertDefinitionsForColumn('ut.email', docUri, new Position(12, 5), new Range(12, 4, 12, 12), docUri, usersTableSelectRange);
    await assertDefinitionsForColumn('email', docUri, new Position(13, 5), new Range(13, 4, 13, 9), docUri, usersTableSelectRange);

    // For main select
    await assertDefinitionsForColumn('email', docUri, new Position(18, 5), new Range(18, 4, 18, 9), docUri, usersTableSelectRange);
    await assertDefinitionsForColumn('one', docUri, new Position(18, 12), new Range(18, 11, 18, 14), docUri, testTableSelectRange);
    await assertDefinitionsForColumn('id', docUri, new Position(19, 5), new Range(19, 4, 19, 6), tableExistsDoc, MAX_RANGE);
    await assertDefinitionsForColumn('t.id', docUri, new Position(20, 5), new Range(20, 4, 20, 8), tableExistsDoc, MAX_RANGE);
    await assertDefinitionsForColumn('test_table.two', docUri, new Position(21, 5), new Range(21, 4, 21, 18), docUri, testTableSelectRange);
    await assertDefinitionsForColumn('test_table.dv', docUri, new Position(22, 5), new Range(22, 4, 22, 17), docUri, testTableSelectRange);
    await assertDefinitionsForColumn('dv', docUri, new Position(23, 5), new Range(23, 4, 23, 6), docUri, testTableSelectRange);
    await assertDefinitionsForColumn('now', docUri, new Position(24, 5), new Range(24, 4, 24, 7), currentTimeDoc, MAX_RANGE);
    await assertDefinitionsForColumn('current_time_of_day.hour', docUri, new Position(25, 5), new Range(25, 4, 25, 28), currentTimeDoc, MAX_RANGE);
  });
});

function assertDefinitionsForColumn(
  columnName: string,
  docUri: Uri,
  clickPosition: Position,
  originSelectionRange: Range,
  targetUri: Uri,
  targetRange: Range,
): Promise<void> {
  console.log(`Check definitions for column ${columnName}`);
  return assertDefinitions(docUri, clickPosition, [
    {
      originSelectionRange,
      targetUri,
      targetRange,
      targetSelectionRange: targetRange,
    },
  ]);
}
