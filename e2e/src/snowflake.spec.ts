import { assertThat } from 'hamjest';
import { assertAllDiagnostics } from './asserts';
import { activateAndWait, getCustomDocUri, getPreviewText, SNOWFLAKE_PATH } from './helper';

suite('Snowflake', () => {
  test('Should compile simple SQL', async () => {
    // arrange
    const docUri = getCustomDocUri(`${SNOWFLAKE_PATH}/models/join_tables.sql`);

    // act
    await activateAndWait(docUri);

    // assert
    assertThat(
      getPreviewText(),
      `select * from dbt_ls_e2e_dataset.test_table1
      left join dbt_ls_e2e_dataset.users on test_table1.name=users.name
      `,
    );
    await assertAllDiagnostics(docUri, []);
  });
});
