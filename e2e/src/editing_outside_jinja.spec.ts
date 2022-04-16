import { assertThat } from 'hamjest';
import { activateAndWait, getCustomDocUri, getMainEditorText, getPreviewText, replaceText, setTestContent } from './helper';

suite('Editing outside jinja without recompilation', () => {
  const DOC_URI = getCustomDocUri('completion-jinja/models/join_ref.sql');

  test('Should not compile outside jinja if error exists', async () => {
    await activateAndWait(DOC_URI);
    const initialContent = getMainEditorText();
    const initialPreview = getPreviewText();

    await replaceText('  )', '   ');
    await replaceText('select u.id', 'select u.i');
    assertThat(getPreviewText(), getMainEditorText());

    await setTestContent(initialContent);
    assertThat(getPreviewText(), initialPreview);
  });
});
