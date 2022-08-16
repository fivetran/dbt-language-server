import { assertThat } from 'hamjest';
import { activateAndWait, executeInstallLatestDbt, getCustomDocUri, getLatestDbtVersion, getPreviewText, waitPreviewText } from './helper';

suite('Custom version', () => {
  const DOC_URI = getCustomDocUri('special-python-settings/models/version.sql');

  test('Should run project with dbt version specified for workspace', async () => {
    await activateAndWait(DOC_URI);

    assertThat(getPreviewText(), '1.0.8');
  });

  test('Should install latest dbt, restart language server and compile model with new dbt version', async () => {
    const latestVersion = getLatestDbtVersion();
    await activateAndWait(DOC_URI);

    assertThat(getPreviewText(), '1.0.8');
    await executeInstallLatestDbt();

    await waitPreviewText(latestVersion);

    assertThat(getPreviewText(), latestVersion);
  }).timeout('100s');
});
