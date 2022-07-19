import { assertThat } from 'hamjest';
import { languages, Uri } from 'vscode';
import { activateAndWait, getCustomDocUri, getDocUri, getPreviewText, PREVIEW_URI, sleep } from './helper';

suite('Multi-project', () => {
  test('Should run several dbt instances', async () => {
    await testOneProject(getDocUri('simple_select_dbt.sql'), 'select * from `singular-vector-135519`.dbt_ls_e2e_dataset.test_table1');

    await testOneProject(
      getCustomDocUri('two-projects/subfolder/project2/transformations/test/project2_model.sql'),
      'select * from `singular-vector-135519`.dbt_ls_e2e_dataset.users',
    );

    await testOneProject(
      getCustomDocUri('two-projects/project1/models/project1_model.sql'),
      'select * from `singular-vector-135519`.dbt_ls_e2e_dataset.test_table1',
    );
  });

  async function testOneProject(docUri: Uri, expectedPreview: string): Promise<void> {
    await activateAndWait(docUri);

    assertThat(getPreviewText(), expectedPreview);
    await sleep(100);
    assertThat(languages.getDiagnostics(docUri).length, 0);
    assertThat(languages.getDiagnostics(Uri.parse(PREVIEW_URI)).length, 0);
  }
});
