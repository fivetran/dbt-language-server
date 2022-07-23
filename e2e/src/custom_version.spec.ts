import { assertThat } from 'hamjest';
import { activateAndWait, getCustomDocUri, getPreviewText } from './helper';

suite('Custom version', () => {
  test('Should run project with dbt version specified for workspace', async () => {
    await activateAndWait(getCustomDocUri('special-python-settings/models/version.sql'));

    assertThat(getPreviewText(), '1.0.0');
  });
});
