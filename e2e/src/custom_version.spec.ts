import { assertThat } from 'hamjest';
import { activateAndWait, getCustomDocUri, getPreviewText } from './helper';

suite('Multi-project', () => {
  test('Should run project with dbt version specified for workspace', async () => {
    await activateAndWait(getCustomDocUri('special-python-settings/models/version.sql'));

    assertThat(getPreviewText(), '0.20.1');
  });
});
