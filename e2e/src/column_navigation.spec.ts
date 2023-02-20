import { Position, Range, Uri } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getDocUri, MAX_RANGE } from './helper';

suite('Definitions for columns', () => {
  test('Should suggest definitions for different columns', async () => {
    const docUri = getDocUri('column_navigation.sql');
    await activateAndWait(docUri);

    const tableExistsDoc = getDocUri('table_exists.sql');
    const currentTimeDoc = getDocUri('current_time_of_day.sql');
    const usersTableSelectRange = new Range(1, 4, 1, 83);
    const testTableSelectRange = new Range(3, 4, 5, 51);

    // For query_from_other_with
    let line = 8;
    await assertDefinitionsForColumn('tt.one', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, testTableSelectRange);
    line++;
    await assertDefinitionsForColumn('tt.dv', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, testTableSelectRange);
    line++;
    await assertDefinitionsForColumn('dv', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, testTableSelectRange);
    line++;
    await assertDefinitionsForColumn('tt.two', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, testTableSelectRange);
    line++;
    await assertDefinitionsForColumn('ut.two', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, usersTableSelectRange);
    line++;
    await assertDefinitionsForColumn('ut.email', docUri, new Position(line, 5), new Range(line, 4, line, 12), docUri, usersTableSelectRange);
    line++;
    await assertDefinitionsForColumn('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersTableSelectRange);

    // For main select
    line += 5;
    await assertDefinitionsForColumn('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersTableSelectRange);
    await assertDefinitionsForColumn('one', docUri, new Position(line, 12), new Range(line, 11, line, 14), docUri, testTableSelectRange);
    line++;
    await assertDefinitionsForColumn('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), tableExistsDoc, MAX_RANGE);
    line++;
    await assertDefinitionsForColumn('t.id', docUri, new Position(line, 5), new Range(line, 4, line, 8), tableExistsDoc, MAX_RANGE);
    line++;
    await assertDefinitionsForColumn('test_table.two', docUri, new Position(line, 5), new Range(line, 4, line, 18), docUri, testTableSelectRange);
    line++;
    await assertDefinitionsForColumn('test_table.dv', docUri, new Position(line, 5), new Range(line, 4, line, 17), docUri, testTableSelectRange);
    line++;
    await assertDefinitionsForColumn('dv', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, testTableSelectRange);
    line++;
    await assertDefinitionsForColumn('now', docUri, new Position(line, 5), new Range(line, 4, line, 7), currentTimeDoc, MAX_RANGE);
    line++;
    await assertDefinitionsForColumn(
      'current_time_of_day.hour',
      docUri,
      new Position(line, 5),
      new Range(line, 4, line, 28),
      currentTimeDoc,
      MAX_RANGE,
    );
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
