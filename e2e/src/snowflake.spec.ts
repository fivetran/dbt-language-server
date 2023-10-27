import { assertThat, isEmpty } from 'hamjest';
import { DiagnosticSeverity, Range, languages } from 'vscode';
import { assertAllDiagnostics } from './asserts';
import { SNOWFLAKE_PATH, activateAndWait, getCustomDocUri, getPreviewText, openDocument, replaceText, runDbtDeps, waitDiagnostics } from './helper';

suite('Snowflake', () => {
  test('Should run dbt deps', async () => {
    // arrange
    const projectUri = getCustomDocUri(`${SNOWFLAKE_PATH}/dbt_project.yml`);
    await openDocument(projectUri);
    await waitDiagnostics(projectUri, 1);

    // act
    await runDbtDeps();
    await waitDiagnostics(projectUri, 0);

    // assert
    assertThat(languages.getDiagnostics(projectUri), isEmpty());
  });

  test('Should compile simple SQL', async () => {
    const docUri = getCustomDocUri(`${SNOWFLAKE_PATH}/models/join_tables.sql`);

    await activateAndWait(docUri);

    assertThat(
      getPreviewText(),
      `select * from e2e_db.dbt_ls_e2e_dataset.test_table1 as tt
inner join lateral (select * from e2e_db.dbt_ls_e2e_dataset.users as u);`,
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
