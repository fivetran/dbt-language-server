import { assertThat, hasSize } from 'hamjest';
import { writeFileSync } from 'node:fs';
import { languages } from 'vscode';
import { activateAndWait, activateAndWaitManifestParsed, getCustomDocUri, PROJECT1_PATH, replaceText, sleep } from './helper';

suite('Entire project analysis', () => {
  const MODELS_PATH = 'two-projects/project1/models';
  const PROJECT1_MODEL_URI = getCustomDocUri(`${MODELS_PATH}/project1_model.sql`);
  const DEPENDENT_MODEL_URI = getCustomDocUri(`${MODELS_PATH}/dependent_model.sql`);

  test('Should reanalyze project after external change', async () => {
    await activateAndWaitManifestParsed(getCustomDocUri('two-projects/project1/dbt_project.yml'), PROJECT1_PATH);
    assertThat(languages.getDiagnostics(PROJECT1_MODEL_URI), hasSize(0));
    assertThat(languages.getDiagnostics(DEPENDENT_MODEL_URI), hasSize(0));

    writeFileSync(PROJECT1_MODEL_URI.fsPath, getNewContent('name'));

    while (languages.getDiagnostics(DEPENDENT_MODEL_URI).length === 0) {
      await sleep(300);
    }

    assertThat(languages.getDiagnostics(PROJECT1_MODEL_URI), hasSize(0));
    assertThat(languages.getDiagnostics(DEPENDENT_MODEL_URI), hasSize(1));

    writeFileSync(PROJECT1_MODEL_URI.fsPath, getNewContent('*'));

    while (languages.getDiagnostics(DEPENDENT_MODEL_URI).length === 1) {
      await sleep(300);
    }

    assertThat(languages.getDiagnostics(PROJECT1_MODEL_URI), hasSize(0));
    assertThat(languages.getDiagnostics(DEPENDENT_MODEL_URI), hasSize(0));
  }).timeout('100s');

  // TODO: Don't skip once tree will be analyzed on change
  test.skip('Should analyze dependant models and report about errors', async () => {
    await activateAndWait(PROJECT1_MODEL_URI);

    assertThat(languages.getDiagnostics(PROJECT1_MODEL_URI), hasSize(0));
    assertThat(languages.getDiagnostics(DEPENDENT_MODEL_URI), hasSize(0));

    await replaceText('*', 'name');

    assertThat(languages.getDiagnostics(PROJECT1_MODEL_URI), hasSize(0));
    assertThat(languages.getDiagnostics(DEPENDENT_MODEL_URI), hasSize(1));

    await replaceText('name', '*');

    assertThat(languages.getDiagnostics(PROJECT1_MODEL_URI), hasSize(0));
    assertThat(languages.getDiagnostics(DEPENDENT_MODEL_URI), hasSize(0));
  });
});

function getNewContent(whatToSelect: string): string {
  return `select ${whatToSelect} from {{ var('test_project') }}.dbt_ls_e2e_dataset.{{ var('table_1') }}\n`;
}
