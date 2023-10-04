import { Position, Range, Uri } from 'vscode';
import { assertDefinitions } from './asserts';
import { MAX_RANGE, activateAndWait, getDocUri } from './helper';

suite('Definitions for columns', () => {
  test('Should suggest definitions for different columns', async () => {
    const docUri = getDocUri('column_navigation.sql');
    await activateAndWait(docUri);

    const tableExistsDoc = getDocUri('table_exists.sql');
    const currentTimeDoc = getDocUri('current_time_of_day.sql');

    const usersSelectRange = new Range(1, 2, 4, 43);
    const testSelectRange = new Range(6, 4, 9, 51);
    const starSelect = new Range(25, 2, 28, 16);
    const grTableSelectRange = new Range(30, 2, 33, 12);
    const idSourceSelectRange = new Range(23, 2, 23, 16);
    const distinctSelectRange = new Range(41, 2, 43, 11);

    const emailColumnRange = new Range(2, 4, 2, 9);
    const u1DivisionColumnRange = new Range(8, 4, 8, 15);
    const grEmailColumnRange = new Range(31, 4, 31, 9);
    const starTest1ColumnRange = new Range(42, 4, 42, 14);

    const usersFromRange = new Range(4, 7, 4, 43);
    const testFromRange = new Range(9, 9, 9, 45);
    // For users_table
    let line = 2;
    await assertCol('email', docUri, new Position(line, 5), emailColumnRange, docUri, usersFromRange, usersFromRange);
    line++;
    await assertCol('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, usersFromRange, usersFromRange);

    // For test_table
    line += 5;
    await assertCol('id', docUri, new Position(line, 5), new Range(line, 4, line, 15), docUri, testFromRange, testFromRange);

    // For query_from_other_with
    line += 4;
    await assertCol('tt.one', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, testSelectRange, testSelectRange);
    line++;
    await assertCol('tt.dv', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('dv', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('tt.two', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, testSelectRange, testSelectRange);
    line++;
    await assertCol('ut.two', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, usersSelectRange, usersSelectRange);
    line++;
    await assertCol('ut.email', docUri, new Position(line, 5), new Range(line, 4, line, 12), docUri, usersSelectRange, emailColumnRange);
    line++;
    await assertCol('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersSelectRange, emailColumnRange);
    line++;
    await assertCol('coalesce tt.one', docUri, new Position(line, 14), new Range(line, 13, line, 19), docUri, testSelectRange, testSelectRange);
    await assertCol('coalesce ut.two', docUri, new Position(line, 22), new Range(line, 21, line, 27), docUri, usersSelectRange, usersSelectRange);
    await assertCol('coalesce tt.two', docUri, new Position(line, 30), new Range(line, 29, line, 35), docUri, testSelectRange, testSelectRange);

    // For star
    line += 8;
    await assertCol('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, idSourceSelectRange, idSourceSelectRange);

    // For gr_table
    line += 4;
    await assertCol('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersSelectRange, emailColumnRange);

    // For group_external
    line += 5;
    await assertCol('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), tableExistsDoc, MAX_RANGE, MAX_RANGE);
    line++;
    await assertCol('min(id)', docUri, new Position(line, 9), new Range(line, 8, line, 10), tableExistsDoc, MAX_RANGE, MAX_RANGE);

    // For select_distinct
    line += 5;
    await assertCol('star_test1', docUri, new Position(line, 5), new Range(line, 4, line, 14), docUri, starSelect, starSelect);

    // For main select
    line += 5;
    await assertCol('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersSelectRange, emailColumnRange);
    await assertCol('one', docUri, new Position(line, 12), new Range(line, 11, line, 14), docUri, testSelectRange, testSelectRange);
    line++;
    await assertCol('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), tableExistsDoc, MAX_RANGE, MAX_RANGE);
    line++;
    await assertCol('t.id', docUri, new Position(line, 5), new Range(line, 4, line, 8), tableExistsDoc, MAX_RANGE, MAX_RANGE);
    line++;
    await assertCol('test_table.two', docUri, new Position(line, 5), new Range(line, 4, line, 18), docUri, testSelectRange, testSelectRange);
    line++;
    await assertCol('test_table.dv', docUri, new Position(line, 5), new Range(line, 4, line, 17), docUri, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('dv', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('ct2.now', docUri, new Position(line, 5), new Range(line, 4, line, 11), currentTimeDoc, MAX_RANGE, MAX_RANGE);
    line++;
    await assertCol('ct1.hour', docUri, new Position(line, 5), new Range(line, 4, line, 12), currentTimeDoc, MAX_RANGE, MAX_RANGE);
    line++;
    await assertCol('star.star_test1', docUri, new Position(line, 5), new Range(line, 4, line, 19), docUri, starSelect, starSelect);
    line++;
    await assertCol('another_alias.star_test1', docUri, new Position(line, 5), new Range(line, 4, line, 28), docUri, starSelect, starSelect);
    line++;
    await assertCol('grouping_email', docUri, new Position(line, 5), new Range(line, 4, line, 18), docUri, grTableSelectRange, grEmailColumnRange);
    line++;
    await assertCol('this_is_one', docUri, new Position(line, 5), new Range(line, 4, line, 15), docUri, distinctSelectRange, starTest1ColumnRange);
  });
});

function assertCol(
  columnName: string,
  docUri: Uri,
  clickPosition: Position,
  originSelectionRange: Range,
  targetUri: Uri,
  targetRange: Range,
  targetSelectionRange: Range,
): Promise<void> {
  console.log(`Check definitions for column ${columnName}. Click line: ${clickPosition.line}`);
  return assertDefinitions(docUri, clickPosition, [
    {
      originSelectionRange,
      targetUri,
      targetRange,
      targetSelectionRange,
    },
  ]);
}
