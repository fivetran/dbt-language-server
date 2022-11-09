import { assertThat, defined, not, startsWith } from 'hamjest';
import { LanguageStatusSeverity } from 'vscode';
import { createAndOpenTempModel, executeCreateFile, getLanguageStatusItems, sleep, TEST_FIXTURE_PATH } from './helper';

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
  assertThat(items.activeDbtProject.text, 'dbt project');
  assertThat(items.activeDbtProject.detail, TEST_FIXTURE_PATH);

  assertThat(items.python.busy, false);

  assertThat(items.dbt.busy, false);
  assertThat(items.dbt.text, startsWith('dbt '));
  assertThat(items.dbt.detail, 'latest version installed');
  assertThat(items.dbt.severity, LanguageStatusSeverity.Information);
  assertThat(items.dbt.command, not(defined()));

  assertThat(items.dbtAdapters.busy, false);
  assertThat(items.dbtAdapters.detail, 'installed dbt adapters');
  assertThat(items.dbtAdapters.severity, LanguageStatusSeverity.Information);

  assertThat(items.dbtPackages.busy, false);
  assertThat(items.dbtPackages.text, 'No packages.yml');
  assertThat(items.dbtPackages.detail, '');
  assertThat(items.dbtPackages.severity, LanguageStatusSeverity.Information);
  assertThat(items.dbtPackages.command?.title, 'Install dbt Packages');

  assertThat(items.profilesYml.busy, false);
  assertThat(items.profilesYml.text, 'profiles.yml');
}

function assertNoProjectLanguageStatusItems(): void {
  const items = getLanguageStatusItems();
  assertThat(items.activeDbtProject.busy, false);
  assertThat(items.activeDbtProject.text, 'No active dbt project');
  assertThat(items.activeDbtProject.detail, '');

  assertThat(items.python.busy, false);

  assertThat(items.dbt.busy, false);

  assertThat(items.dbtAdapters.busy, false);
  assertThat(items.dbtAdapters.detail, 'installed dbt adapters');
}
