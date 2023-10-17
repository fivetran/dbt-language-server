import { Position, Range, Uri } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getDocUri, sleep } from './helper';

suite('Definitions for columns', () => {
  test('Should suggest definitions for different columns', async () => {
    const docUri = getDocUri('column_navigation.sql');
    await activateAndWait(docUri);
    await sleep(5000);

    const tableExistsDoc = getDocUri('table_exists.sql');
    const currentTimeDoc = getDocUri('current_time_of_day.sql');

    const usersIdRange = new Range(3, 4, 3, 6);
    const usersSelectRange = new Range(1, 2, 4, 43);
    const testSelectRange = new Range(6, 4, 9, 51);
    const starSelect = new Range(25, 2, 28, 16);
    const grTableSelectRange = new Range(30, 2, 33, 12);
    const idSourceSelectRange = new Range(23, 2, 23, 16);
    const distinctSelectRange = new Range(41, 2, 43, 11);
    const timeOfDaySelect = new Range(17, 0, 19, 65);
    const tableExistsSelect = new Range(6, 0, 6, 14);

    const emailColumnRange = new Range(2, 4, 2, 9);
    const u1DivisionColumnRange = new Range(8, 4, 8, 15);
    const grEmailColumnRange = new Range(31, 4, 31, 9);
    const starTest1ColumnRange = new Range(42, 4, 42, 14);
    const usersTableColumn2 = new Range(3, 19, 3, 20);
    const testTableColumn1 = new Range(6, 11, 6, 12);
    const testTableColumn2 = new Range(7, 4, 7, 5);
    const idSourceColumn1 = new Range(23, 9, 23, 10);
    const starColumn1 = new Range(26, 4, 26, 5);
    const tableExistsId = new Range(6, 7, 6, 8);

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
    await assertCol('tt.one', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, testSelectRange, testTableColumn1);
    line++;
    await assertCol('tt.dv', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('dv', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('tt.two', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, testSelectRange, testTableColumn2);
    line++;
    await assertCol('ut.two', docUri, new Position(line, 5), new Range(line, 4, line, 10), docUri, usersSelectRange, usersTableColumn2);
    line++;
    await assertCol('ut.email', docUri, new Position(line, 5), new Range(line, 4, line, 12), docUri, usersSelectRange, emailColumnRange);
    line++;
    await assertCol('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersSelectRange, emailColumnRange);
    line++;
    await assertCol('coalesce tt.one', docUri, new Position(line, 14), new Range(line, 13, line, 19), docUri, testSelectRange, testTableColumn1);
    await assertCol('coalesce ut.two', docUri, new Position(line, 22), new Range(line, 21, line, 27), docUri, usersSelectRange, usersTableColumn2);
    await assertCol('coalesce tt.two', docUri, new Position(line, 30), new Range(line, 29, line, 35), docUri, testSelectRange, testTableColumn2);

    // For star
    line += 8;
    await assertCol('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, idSourceSelectRange, idSourceColumn1);

    // For gr_table
    line += 4;
    await assertCol('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersSelectRange, emailColumnRange);

    // For group_external
    line += 5;
    await assertCol('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), tableExistsDoc, tableExistsSelect, tableExistsId);
    line++;
    await assertCol('min(id)', docUri, new Position(line, 9), new Range(line, 8, line, 10), tableExistsDoc, tableExistsSelect, tableExistsId);

    // For select_distinct
    line += 5;
    await assertCol('star_test1', docUri, new Position(line, 5), new Range(line, 4, line, 14), docUri, starSelect, starColumn1);

    // For window_with
    line += 6;
    await assertCol('email', docUri, new Position(line, 37), new Range(line, 36, line, 41), docUri, usersSelectRange, emailColumnRange);
    await assertCol('user_id', docUri, new Position(line, 52), new Range(line, 51, line, 58), docUri, usersSelectRange, usersIdRange);

    // For above_average_users
    line += 5;
    await assertCol('user_id', docUri, new Position(line, 31), new Range(line, 30, line, 37), docUri, usersSelectRange, usersIdRange);

    // For union_all
    line += 2;
    await assertCol('user_id', docUri, new Position(line, 17), new Range(line, 16, line, 23), docUri, usersSelectRange, usersIdRange);
    line += 2;
    await assertCol('email', docUri, new Position(line, 10), new Range(line, 9, line, 14), docUri, usersSelectRange, emailColumnRange);

    // For main select
    line += 4;
    await assertCol('email', docUri, new Position(line, 5), new Range(line, 4, line, 9), docUri, usersSelectRange, emailColumnRange);
    await assertCol('one', docUri, new Position(line, 12), new Range(line, 11, line, 14), docUri, testSelectRange, testTableColumn1);
    line++;
    await assertCol('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), tableExistsDoc, tableExistsSelect, tableExistsId);
    line++;
    await assertCol('t.id', docUri, new Position(line, 5), new Range(line, 4, line, 8), tableExistsDoc, tableExistsSelect, tableExistsId);
    line++;
    await assertCol('test_table.two', docUri, new Position(line, 5), new Range(line, 4, line, 18), docUri, testSelectRange, testTableColumn2);
    line++;
    await assertCol('test_table.dv', docUri, new Position(line, 5), new Range(line, 4, line, 17), docUri, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('dv', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('ct2.now', docUri, new Position(line, 5), new Range(line, 4, line, 11), currentTimeDoc, timeOfDaySelect, timeOfDaySelect);
    line++;
    await assertCol('ct1.hour', docUri, new Position(line, 5), new Range(line, 4, line, 12), currentTimeDoc, timeOfDaySelect, timeOfDaySelect);
    line++;
    await assertCol('star.star_test1', docUri, new Position(line, 5), new Range(line, 4, line, 19), docUri, starSelect, starColumn1);
    line++;
    await assertCol('another_alias.star_test1', docUri, new Position(line, 5), new Range(line, 4, line, 28), docUri, starSelect, starColumn1);
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
