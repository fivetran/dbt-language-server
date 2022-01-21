import { assertThat } from 'hamjest';
import { languages, Uri } from 'vscode';
import { activateAndWait, getCustomDocUri, getDocUri, getPreviewText } from './helper';

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

  test('Should run project with dbt version specified for workspace', async () => {
    await activateAndWait(getCustomDocUri('special-python-settings/models/version.sql'));

    assertThat(getPreviewText(), '0.20.1');
  });

  async function testOneProject(docUri: Uri, expectedPreview: string): Promise<void> {
    await activateAndWait(docUri);

    assertThat(getPreviewText(), expectedPreview);
    assertThat(languages.getDiagnostics().length, 0);
  }
});
