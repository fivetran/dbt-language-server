import { Position, Range, Uri } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getDocUri, MAX_RANGE } from './helper';

suite('Definitions for columns', () => {
  test('Should suggest definitions for different columns', async () => {
    const docUri = getDocUri('column_navigation.sql');
    await activateAndWait(docUri);

    const tableExistsDoc = getDocUri('table_exists.sql');
    const currentTimeDoc = getDocUri('current_time_of_day.sql');

    const usersSelectRange = new Range(1, 2, 4, 43);
    const testSelectRange = new Range(6, 4, 9, 51);
    const starSelectRange = new Range(25, 2, 28, 16);
    const grTableSelectRange = new Range(30, 2, 33, 12);
    const idSourceSelectRange = new Range(23, 2, 23, 16);

    const usersFromRange = new Range(4, 7, 4, 43);
    const testFromRange = new Range(9, 9, 9, 45);
    // For users_table
    let line = 2;
    await assertColumnDefinitions('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersFromRange);
    line++;
    await assertColumnDefinitions('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, usersFromRange);

    // For test_table
    line += 5;
    await assertColumnDefinitions('id', docUri, new Position(line, 5), new Range(line, 4, line, 15), docUri, testFromRange);

    // For query_from_other_with
    line += 4;
    await assertColumnDefinitions('tt.one', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, testSelectRange);
    line++;
    await assertColumnDefinitions('tt.dv', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, testSelectRange);
    line++;
    await assertColumnDefinitions('dv', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, testSelectRange);
    line++;
    await assertColumnDefinitions('tt.two', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, testSelectRange);
    line++;
    await assertColumnDefinitions('ut.two', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, usersSelectRange);
    line++;
    await assertColumnDefinitions('ut.email', docUri, new Position(line, 5), new Range(line, 4, line, 12), docUri, usersSelectRange);
    line++;
    await assertColumnDefinitions('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersSelectRange);
    line++;
    await assertColumnDefinitions('coalesce tt.one', docUri, new Position(line, 14), new Range(line, 13, line, 19), docUri, testSelectRange);
    await assertColumnDefinitions('coalesce ut.two', docUri, new Position(line, 22), new Range(line, 21, line, 27), docUri, usersSelectRange);
    await assertColumnDefinitions('coalesce tt.two', docUri, new Position(line, 30), new Range(line, 29, line, 35), docUri, testSelectRange);

    // For star
    line += 8;
    await assertColumnDefinitions('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, idSourceSelectRange);

    // For gr_table
    line += 4;
    await assertColumnDefinitions('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersSelectRange);

    // For group_external
    line += 5;
    await assertColumnDefinitions('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), tableExistsDoc, MAX_RANGE);
    line++;
    await assertColumnDefinitions('min(id)', docUri, new Position(line, 9), new Range(line, 8, line, 10), tableExistsDoc, MAX_RANGE);

    // For main select
    line += 6;
    await assertColumnDefinitions('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersSelectRange);
    await assertColumnDefinitions('one', docUri, new Position(line, 12), new Range(line, 11, line, 14), docUri, testSelectRange);
    line++;
    await assertColumnDefinitions('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), tableExistsDoc, MAX_RANGE);
    line++;
    await assertColumnDefinitions('t.id', docUri, new Position(line, 5), new Range(line, 4, line, 8), tableExistsDoc, MAX_RANGE);
    line++;
    await assertColumnDefinitions('test_table.two', docUri, new Position(line, 5), new Range(line, 4, line, 18), docUri, testSelectRange);
    line++;
    await assertColumnDefinitions('test_table.dv', docUri, new Position(line, 5), new Range(line, 4, line, 17), docUri, testSelectRange);
    line++;
    await assertColumnDefinitions('dv', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, testSelectRange);
    line++;
    await assertColumnDefinitions('ct2.now', docUri, new Position(line, 5), new Range(line, 4, line, 11), currentTimeDoc, MAX_RANGE);
    line++;
    await assertColumnDefinitions('ct1.hour', docUri, new Position(line, 5), new Range(line, 4, line, 12), currentTimeDoc, MAX_RANGE);
    line++;
    await assertColumnDefinitions('star.star_test1', docUri, new Position(line, 5), new Range(line, 4, line, 19), docUri, starSelectRange);
    line++;
    await assertColumnDefinitions('another_alias.star_test1', docUri, new Position(line, 5), new Range(line, 4, line, 28), docUri, starSelectRange);
    line++;
    await assertColumnDefinitions('grouping_email', docUri, new Position(line, 5), new Range(line, 4, line, 18), docUri, grTableSelectRange);
  });
});

function assertColumnDefinitions(
  columnName: string,
  docUri: Uri,
  clickPosition: Position,
  originSelectionRange: Range,
  targetUri: Uri,
  targetRange: Range,
): Promise<void> {
  console.log(`Check definitions for column ${columnName}. Click line: ${clickPosition.line}`);
  return assertDefinitions(docUri, clickPosition, [
    {
      originSelectionRange,
      targetUri,
      targetRange,
      targetSelectionRange: targetRange,
    },
  ]);
}
