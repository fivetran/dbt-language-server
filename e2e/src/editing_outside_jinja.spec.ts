import { assertThat } from 'hamjest';
import { languages } from 'vscode';
import { assertAllDiagnostics } from './asserts';
import { activateAndWait, getCustomDocUri, getMainEditorText, getPreviewText, replaceText, setTestContent } from './helper';

suite('Editing outside jinja without recompilation', () => {
  const DOC_URI = getCustomDocUri('completion-jinja/models/join_ref.sql');

  test('Should not compile outside jinja if error exists', async () => {
    await activateAndWait(DOC_URI);
    const initialContent = getMainEditorText();
    const initialPreview = getPreviewText();

    await replaceText('  )', '   ');
    const dbtDiagnostics = languages.getDiagnostics(DOC_URI);

    await replaceText('select u.id', 'select u.i');
    assertThat(getPreviewText(), getMainEditorText());
    await assertAllDiagnostics(DOC_URI, dbtDiagnostics);

    await setTestContent(initialContent);
    assertThat(getPreviewText(), initialPreview);
    await assertAllDiagnostics(DOC_URI, []);
  });
});
