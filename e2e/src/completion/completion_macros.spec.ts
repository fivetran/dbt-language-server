import { assertThat, defined } from 'hamjest';
import { CompletionItem, CompletionItemKind, Position } from 'vscode';
import { assertCompletions } from '../asserts';
import { activateAndWait, getCustomDocUri, triggerCompletion, waitManifestJson } from '../helper';

suite('Should suggest macros completions', () => {
  const PROJECT = 'postgres';
  const PROJECT_FILE_NAME = `${PROJECT}/models/active_users_orders_count.sql`;

  const MACROS_COMPLETIONS = [
    ['extract_first_name', 'extract_first_name'],
    ['extract_last_name', 'extract_last_name'],
  ];

  test('Should suggest macros', async () => {
    // arrange
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await waitManifestJson(PROJECT);

    // act
    const actualCompletionList = await triggerCompletion(docUri, new Position(0, 17));

    // assert
    const expectedCompletions = getMacrosCompletionList();
    expectedCompletions.forEach(c => {
      const actualCompletion = actualCompletionList.items.find(a => a.label === c.label && a.insertText === c.insertText);
      assertThat(actualCompletion, defined());
    });
  });

  test('Should suggest macros from package', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);

    await activateAndWait(docUri);
    await waitManifestJson(PROJECT);

    await assertCompletions(docUri, new Position(0, 89), getMacrosCompletionList());
  });

  function getMacrosCompletionList(): CompletionItem[] {
    return MACROS_COMPLETIONS.map<CompletionItem>(c => ({ label: c[0], insertText: c[1], kind: CompletionItemKind.Value }));
  }
});
