import { assertThat } from 'hamjest';
import { activateAndWait, getCustomDocUri, getPreviewText } from './helper';

suite('Certain version', () => {
  const DOC_URI = getCustomDocUri('special-python-settings/models/version.sql');
  const VENV_VERSION = '1.2.2';

  test('Should run project with dbt version specified for workspace', async () => {
    await activateAndWait(DOC_URI);

    assertThat(getPreviewText(), VENV_VERSION);
  }).timeout('100s');
});
