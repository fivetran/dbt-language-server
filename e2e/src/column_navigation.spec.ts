import { Position, Range, Uri } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getDocUri, MAX_RANGE } from './helper';

suite('Definitions for columns', () => {
  test('Should suggest definitions for different columns', async () => {
    const docUri = getDocUri('column_navigation.sql');
    await activateAndWait(docUri);

    const tableExistsDoc = getDocUri('table_exists.sql');
    const currentTimeDoc = getDocUri('current_time_of_day.sql');

    const usersSelectRange = new Range(1, 4, 1, 83);
    const testSelectRange = new Range(3, 4, 5, 51);
    const starSelectRange = new Range(20, 2, 23, 16);
    const idSourceSelectRange = new Range(18, 2, 18, 16);

    // For query_from_other_with
    let line = 8;
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

    // For star
    line += 8;
    await assertColumnDefinitions('id', docUri, new Position(line, 5), new Range(line, 4, line, 6), docUri, idSourceSelectRange);

    // For main select
    line += 5;
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
