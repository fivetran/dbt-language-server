import { assertThat } from 'hamjest';
import { activateAndWait, getCustomDocUri, getPreviewText } from './helper';

suite('Postgres destination', () => {
  test('Should work with postgres destination', async () => {
    await activateAndWait(getCustomDocUri('postgres/models/admin_users.sql'));

    assertThat(getPreviewText(), `select * from "postgres"."vscode_language_server"."users" where role = 'ADMIN'`);
  });
});
