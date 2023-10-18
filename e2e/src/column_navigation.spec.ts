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

    // const usersIdRange = new Range(4, 4, 4, 6);
    const usersSelectRange = new Range(1, 2, 5, 43);
    const testSelectRange = new Range(7, 4, 10, 51);
    const starSelect = new Range(26, 2, 29, 16);
    const grTableSelectRange = new Range(31, 2, 34, 12);
    const idSourceSelectRange = new Range(24, 2, 24, 16);
    const distinctSelectRange = new Range(42, 2, 44, 11);
    const complexColSelectRange = new Range(60, 2, 68, 18);
    const timeOfDaySelect = new Range(17, 0, 19, 65);
    const tableExistsSelect = new Range(6, 0, 6, 14);

    const usersTableUserIdAlias = new Range(4, 7, 4, 17);
    const usersTableTwoAlias = new Range(4, 21, 4, 27);
    const testTableOneAlias = new Range(7, 13, 7, 19);
    const testTableDvAlias = new Range(9, 16, 9, 21);
    const testTableTwoAlias = new Range(8, 6, 8, 12);
    const sumResultAlias = new Range(67, 6, 67, 19);
    const idSourceIdAlias = new Range(24, 11, 24, 16);
    const starStarTestAlias = new Range(27, 6, 27, 19);
    const tableExistsIdAlias = new Range(6, 9, 6, 14);
    const grTableGroupinEmailAlias = new Range(32, 10, 32, 27);
    const selectDisitnctThisIsOneAlias = new Range(43, 15, 43, 29);

    const emailColumnRange = new Range(3, 4, 3, 9);
    // const u1DivisionColumnRange = new Range(9, 4, 9, 15);
    // const grEmailColumnRange = new Range(32, 4, 32, 9);
    // const starTest1ColumnRange = new Range(43, 4, 43, 14);
    // const usersTableColumn2 = new Range(4, 19, 4, 20);
    // const testTableColumn1 = new Range(7, 11, 7, 12);
    // const testTableColumn2 = new Range(8, 4, 8, 5);
    // const idSourceColumn1 = new Range(24, 9, 24, 10);
    // const starColumn1 = new Range(27, 4, 27, 5);
    // const tableExistsId = new Range(6, 7, 6, 8);

    const usersFromRange = new Range(5, 7, 5, 43);
    const testFromRange = new Range(10, 9, 10, 45);

    // For users_table
    let line = 3;
    await assertCol('email', line, 4, DOC_URI, usersFromRange, usersFromRange);
    line++;
    await assertCol('id', line, 4, DOC_URI, usersFromRange, usersFromRange);

    // For test_table
    line += 5;
    await assertCol('u1.division', line, 4, DOC_URI, testFromRange, testFromRange);

    // For query_from_other_with
    line += 4;
    await assertCol('tt.one', line, 4, DOC_URI, testSelectRange, testTableOneAlias);
    line++;
    await assertCol('tt.dv', line, 4, DOC_URI, testSelectRange, testTableDvAlias);
    line++;
    await assertCol('dv', line, 4, DOC_URI, testSelectRange, testTableDvAlias);
    line++;
    await assertCol('tt.two', line, 4, DOC_URI, testSelectRange, testTableTwoAlias);
    line++;
    await assertCol('ut.two', line, 4, DOC_URI, usersSelectRange, usersTableTwoAlias);
    line++;
    await assertCol('ut.email', line, 4, DOC_URI, usersSelectRange, emailColumnRange);
    line++;
    await assertCol('email', line, 4, DOC_URI, usersSelectRange, emailColumnRange);
    line++;
    await assertCol('tt.one', line, 13, DOC_URI, testSelectRange, testTableOneAlias);
    await assertCol('ut.two', line, 21, DOC_URI, usersSelectRange, usersTableTwoAlias);
    await assertCol('tt.two', line, 29, DOC_URI, testSelectRange, testTableTwoAlias);

    // For star
    line += 8;
    await assertCol('id', line, 4, DOC_URI, idSourceSelectRange, idSourceIdAlias);

    // For gr_table
    line += 4;
    await assertCol('email', line, 4, DOC_URI, usersSelectRange, emailColumnRange);

    // For group_external
    line += 5;
    await assertCol('id', line, 4, tableExistsDoc, tableExistsSelect, tableExistsIdAlias);
    line++;
    await assertCol('id', line, 8, tableExistsDoc, tableExistsSelect, tableExistsIdAlias); // min(id)

    // For select_distinct
    line += 5;
    await assertCol('star_test1', line, 4, DOC_URI, starSelect, starStarTestAlias);

    // For window_with
    line += 6;
    await assertCol('email', line, 36, DOC_URI, usersSelectRange, emailColumnRange);
    await assertCol('user_id', line, 51, DOC_URI, usersSelectRange, usersTableUserIdAlias);

    // For above_average_users
    line += 5;
    await assertCol('user_id', line, 30, DOC_URI, usersSelectRange, usersTableUserIdAlias);

    // For union_all
    line += 2;
    await assertCol('user_id', line, 16, DOC_URI, usersSelectRange, usersTableUserIdAlias);
    line += 2;
    await assertCol('email', line, 9, DOC_URI, usersSelectRange, emailColumnRange);

    // For main select
    line += 14;
    await assertCol('email', line, 4, DOC_URI, usersSelectRange, emailColumnRange);
    await assertCol('one', line, 11, DOC_URI, testSelectRange, testTableOneAlias);
    line++;
    await assertCol('id', line, 4, tableExistsDoc, tableExistsSelect, tableExistsIdAlias);
    line++;
    await assertCol('t.id', line, 4, tableExistsDoc, tableExistsSelect, tableExistsIdAlias);
    line++;
    await assertCol('test_table.two', line, 4, DOC_URI, testSelectRange, testTableTwoAlias);
    line++;
    await assertCol('test_table.dv', line, 4, DOC_URI, testSelectRange, testTableDvAlias);
    line++;
    await assertCol('dv', line, 4, DOC_URI, testSelectRange, testTableDvAlias);
    line++;
    await assertCol('ct2.now', line, 4, currentTimeDoc, timeOfDaySelect, timeOfDaySelect);
    line++;
    await assertCol('ct1.hour', line, 4, currentTimeDoc, timeOfDaySelect, timeOfDaySelect);
    line++;
    await assertCol('star.star_test1', line, 4, DOC_URI, starSelect, starStarTestAlias);
    line++;
    await assertCol('another_alias.star_test1', line, 4, DOC_URI, starSelect, starStarTestAlias);
    line++;
    await assertCol('grouping_email', line, 4, DOC_URI, grTableSelectRange, grTableGroupinEmailAlias);
    line++;
    await assertCol('this_is_one', line, 4, DOC_URI, distinctSelectRange, selectDisitnctThisIsOneAlias);
    line++;
    await assertCol('sum_result', line, 4, DOC_URI, complexColSelectRange, sumResultAlias);
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
