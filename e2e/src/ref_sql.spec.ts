import { assertThat, endsWith } from 'hamjest';
import { commands } from 'vscode';
import { activateAndWait, getDocUri, getMainEditorText, waitDocumentModification } from './helper';

suite('ref to sql', () => {
  async function runCommandAndCheckResult(command: string, endOfQuery: string): Promise<void> {
    await waitDocumentModification(async () => {
      await commands.executeCommand(command);
    });

    const text = getMainEditorText();
    assertThat(text, endsWith(endOfQuery), `Actual text: ${text}`);
  }

  test('Should convert ref to sql and then to ref', async () => {
    const docUri = getDocUri('ref_sql.sql');
    await activateAndWait(docUri);

    await runCommandAndCheckResult('dbt.refToSql', 'inner join `singular-vector-135519`.`dbt_ls_e2e_dataset`.`table_exists` as s on u.id = s.id;');

    await runCommandAndCheckResult('dbt.sqlToRef', `inner join {{ ref('table_exists') }} as s on u.id = s.id;`);
  });
});
