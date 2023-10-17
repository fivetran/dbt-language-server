import { Position, Range, Uri } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getDocUri, sleep } from './helper';

suite('Definitions for columns', () => {
  const DOC_URI = getDocUri('column_navigation.sql');
  test('Should suggest definitions for different columns', async () => {
    await activateAndWait(DOC_URI);
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
    await assertCol('email', line, 4, DOC_URI, usersFromRange, usersFromRange);
    line++;
    await assertCol('id', line, 4, DOC_URI, usersFromRange, usersFromRange);

    // For test_table
    line += 5;
    await assertCol('u1.division', line, 4, DOC_URI, testFromRange, testFromRange);

    // For query_from_other_with
    line += 4;
    await assertCol('tt.one', line, 4, DOC_URI, testSelectRange, testTableColumn1);
    line++;
    await assertCol('tt.dv', line, 4, DOC_URI, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('dv', line, 4, DOC_URI, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('tt.two', line, 4, DOC_URI, testSelectRange, testTableColumn2);
    line++;
    await assertCol('ut.two', line, 4, DOC_URI, usersSelectRange, usersTableColumn2);
    line++;
    await assertCol('ut.email', line, 4, DOC_URI, usersSelectRange, emailColumnRange);
    line++;
    await assertCol('email', line, 4, DOC_URI, usersSelectRange, emailColumnRange);
    line++;
    await assertCol('tt.one', line, 13, DOC_URI, testSelectRange, testTableColumn1);
    await assertCol('ut.two', line, 21, DOC_URI, usersSelectRange, usersTableColumn2);
    await assertCol('tt.two', line, 29, DOC_URI, testSelectRange, testTableColumn2);

    // For star
    line += 8;
    await assertCol('id', line, 4, DOC_URI, idSourceSelectRange, idSourceColumn1);

    // For gr_table
    line += 4;
    await assertCol('email', line, 4, DOC_URI, usersSelectRange, emailColumnRange);

    // For group_external
    line += 5;
    await assertCol('id', line, 4, tableExistsDoc, tableExistsSelect, tableExistsId);
    line++;
    await assertCol('id', line, 8, tableExistsDoc, tableExistsSelect, tableExistsId); // min(id)

    // For select_distinct
    line += 5;
    await assertCol('star_test1', line, 4, DOC_URI, starSelect, starColumn1);

    // For window_with
    line += 6;
    await assertCol('email', line, 36, DOC_URI, usersSelectRange, emailColumnRange);
    await assertCol('user_id', line, 51, DOC_URI, usersSelectRange, usersIdRange);

    // For above_average_users
    line += 5;
    await assertCol('user_id', line, 30, DOC_URI, usersSelectRange, usersIdRange);

    // For union_all
    line += 2;
    await assertCol('user_id', line, 16, DOC_URI, usersSelectRange, usersIdRange);
    line += 2;
    await assertCol('email', line, 9, DOC_URI, usersSelectRange, emailColumnRange);

    // For main select
    line += 4;
    await assertCol('email', line, 4, DOC_URI, usersSelectRange, emailColumnRange);
    await assertCol('one', line, 11, DOC_URI, testSelectRange, testTableColumn1);
    line++;
    await assertCol('id', line, 4, tableExistsDoc, tableExistsSelect, tableExistsId);
    line++;
    await assertCol('t.id', line, 4, tableExistsDoc, tableExistsSelect, tableExistsId);
    line++;
    await assertCol('test_table.two', line, 4, DOC_URI, testSelectRange, testTableColumn2);
    line++;
    await assertCol('test_table.dv', line, 4, DOC_URI, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('dv', line, 4, DOC_URI, testSelectRange, u1DivisionColumnRange);
    line++;
    await assertCol('ct2.now', line, 4, currentTimeDoc, timeOfDaySelect, timeOfDaySelect);
    line++;
    await assertCol('ct1.hour', line, 4, currentTimeDoc, timeOfDaySelect, timeOfDaySelect);
    line++;
    await assertCol('star.star_test1', line, 4, DOC_URI, starSelect, starColumn1);
    line++;
    await assertCol('another_alias.star_test1', line, 4, DOC_URI, starSelect, starColumn1);
    line++;
    await assertCol('grouping_email', line, 4, DOC_URI, grTableSelectRange, grEmailColumnRange);
    line++;
    await assertCol('this_is_one', line, 4, DOC_URI, distinctSelectRange, starTest1ColumnRange);
  });

  function assertCol(columnName: string, line: number, char: number, targetUri: Uri, targetRange: Range, targetSelectionRange: Range): Promise<void> {
    const originSelectionRange = new Range(new Position(line, char), new Position(line, char + columnName.length));
    const clickPosition = new Position(line, char + 1);
    console.log(`Check definitions for column ${columnName}. Click line: ${line}`);

    return assertDefinitions(DOC_URI, clickPosition, [
      {
        originSelectionRange,
        targetUri,
        targetRange,
        targetSelectionRange,
      },
    ]);
  }
});
