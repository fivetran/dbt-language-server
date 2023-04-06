import { assertThat, containsString, startsWith } from 'hamjest';
import { LanguageStatusSeverity } from 'vscode';
import { TEST_FIXTURE_PATH, createAndOpenTempModel, executeCreateFile, getLanguageStatusItems, sleep } from './helper';

suite('Language status items', () => {
  test('Should show items for project and then common items without project', async () => {
    await createAndOpenTempModel('test-fixture');
    assertProjectLanguageStatusItems();

    await executeCreateFile();
    await sleep(1000);
    assertNoProjectLanguageStatusItems();
  });
});

function assertProjectLanguageStatusItems(): void {
  const items = getLanguageStatusItems();
  assertThat(items.activeDbtProject.busy, false);
  assertThat(items.activeDbtProject.text, 'Current project');
  assertThat(items.activeDbtProject.detail, TEST_FIXTURE_PATH);

  assertThat(items.python.busy, false);

  assertThat(items.dbt.busy, false);
  assertThat(items.dbt.text, startsWith('dbt Core'));
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
  assertThat(items.profilesYml.text, 'e2e-test-project');
  assertThat(items.profilesYml.detail, 'Current profile');
  assertThat(items.profilesYml.severity, LanguageStatusSeverity.Information);
  assertThat(items.profilesYml.command?.title, 'Change target credentials');
}

function assertNoProjectLanguageStatusItems(): void {
  const items = getLanguageStatusItems();
  assertThat(items.activeDbtProject.busy, false);
  assertThat(items.activeDbtProject.text, 'No active dbt project');
  assertThat(items.activeDbtProject.detail, '');

  assertThat(items.python.busy, false);

  assertThat(items.dbt.busy, false);
  assertThat(items.dbt.text, startsWith('dbt Core'));
  assertThat(items.dbt.command?.title, 'Install different version');

  assertThat(items.dbtAdapters.busy, false);
  assertThat(items.dbtAdapters.text, containsString('bigquery'));
  assertThat(items.dbtAdapters.detail, 'installed dbt adapters');
  assertThat(items.dbtAdapters.severity, LanguageStatusSeverity.Information);
  assertThat(items.dbtAdapters.command?.title, 'Install different adapter');
}
