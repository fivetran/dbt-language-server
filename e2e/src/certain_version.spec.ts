import { assertThat, containsString, startsWith } from 'hamjest';
import { LanguageStatusSeverity } from 'vscode';
import { SPECIAL_PYTHON_SETTINGS_PATH, activateAndWait, getCustomDocUri, getLanguageStatusItems, getPreviewText } from './helper';

suite('Certain version', () => {
  const DOC_URI = getCustomDocUri('special-python-settings/models/version.sql');
  const VENV_VERSION = '1.2.2';

  test('Should run project with dbt version specified for workspace', async () => {
    await activateAndWait(DOC_URI);

    assertThat(getPreviewText(), VENV_VERSION);
    assertLanguageStatusItems();
  }).timeout('100s');

  function assertLanguageStatusItems(): void {
    const items = getLanguageStatusItems();
    assertThat(items.activeDbtProject.busy, false);
    assertThat(items.activeDbtProject.text, 'Current project');
    assertThat(items.activeDbtProject.detail, SPECIAL_PYTHON_SETTINGS_PATH);

    assertThat(items.python.busy, false);

    assertThat(items.dbt.busy, false);
    assertThat(items.dbt.text, `dbt Core ${VENV_VERSION}`);
    assertThat(items.dbt.detail, startsWith('installed version. Latest version: '));
    assertThat(items.dbt.severity, LanguageStatusSeverity.Warning);
    assertThat(items.dbt.command?.title, 'Install different version');

    assertThat(items.dbtAdapters.busy, false);
    assertThat(items.dbtAdapters.text, containsString('bigquery'));
    assertThat(items.dbtAdapters.detail, 'installed dbt adapters');
    assertThat(items.dbtAdapters.severity, LanguageStatusSeverity.Information);
    assertThat(items.dbtAdapters.command?.title, 'Install different adapter');

    assertThat(items.dbtPackages.busy, false);
    assertThat(items.dbtPackages.text, 'No packages.yml');
    assertThat(items.dbtPackages.detail, '');
    assertThat(items.dbtPackages.severity, LanguageStatusSeverity.Information);
    assertThat(items.dbtPackages.command?.title, 'Install dbt packages');

    assertThat(items.profilesYml.busy, false);
    assertThat(items.profilesYml.text, 'e2e-test-workspace-project1');
    assertThat(items.profilesYml.detail, 'Current profile');
    assertThat(items.profilesYml.severity, LanguageStatusSeverity.Information);
    assertThat(items.profilesYml.command?.title, 'Install dbt packages');
  }
});
