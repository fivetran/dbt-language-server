import { assertThat } from 'hamjest';
import { DiagnosticSeverity, Range } from 'vscode';
import { assertAllDiagnostics } from './asserts';
import { SNOWFLAKE_PATH, activateAndWait, getCustomDocUri, getPreviewText, replaceText } from './helper';

suite('Snowflake', () => {
  test('Should compile simple SQL', async () => {
    const docUri = getCustomDocUri(`${SNOWFLAKE_PATH}/models/join_tables.sql`);

    await activateAndWait(docUri);

    assertThat(
      getPreviewText(),
      `select * from e2e_db.dbt_ls_e2e_dataset_dbt_ls_e2e_dataset.test_table1 as tt
inner join lateral (select * from e2e_db.dbt_ls_e2e_dataset_dbt_ls_e2e_dataset.users as u);`,
    );
    await assertAllDiagnostics(docUri, []);

    await replaceText('as u)', 'as u) on tt.user_id = u.id');

    await assertAllDiagnostics(docUri, [
      {
        message: 'INNER JOIN LATERAL cannot have an immediately following ON or USING clause',
        range: new Range(1, 0, 1, 5),
        severity: DiagnosticSeverity.Error,
      },
    ]);
  });
});
