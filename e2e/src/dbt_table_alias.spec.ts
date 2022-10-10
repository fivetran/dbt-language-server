import { assertDiagnostics } from './asserts';
import { activateAndWait, COMPLETION_JINJA_PATH, getCustomDocUri, getMainEditorText, openDocument, replaceText, setTestContent } from './helper';

suite('Should resolve tables with specified alias', () => {
  const USERS_FILE_NAME = `${COMPLETION_JINJA_PATH}/models/users.sql`;
  const JOIN_REF_FILE_NAME = `${COMPLETION_JINJA_PATH}/models/join_ref.sql`;
  const USERS_DOC_URI = getCustomDocUri(USERS_FILE_NAME);
  const JOIN_REF_DOC_URI = getCustomDocUri(JOIN_REF_FILE_NAME);

  test('Should resolve table introduced by model with specified alias', async () => {
    await openDocument(USERS_DOC_URI);
    const initialContent = getMainEditorText();
    await replaceText("materialized='table'\n  )\n}}", "materialized='table', alias='super_users'\n  )\n}}", false);

    await activateAndWait(JOIN_REF_DOC_URI);
    await assertDiagnostics(JOIN_REF_DOC_URI, []);

    await openDocument(USERS_DOC_URI);
    await setTestContent(initialContent, false);
  });
});
