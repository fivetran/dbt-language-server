import { assertThat, defined } from 'hamjest';
import { CompletionItem, CompletionItemKind, Position } from 'vscode';
import { assertCompletions } from '../asserts';
import { activateAndWait, getCustomDocUri, triggerCompletion } from '../helper';

suite('Should suggest macros completions', () => {
  const PROJECT_FILE_NAME = 'postgres/models/active_users_orders_count.sql';
  const MACROS_COMPLETIONS: [string, string][] = [
    ['extract_first_name', 'extract_first_name'],
    ['extract_last_name', 'extract_last_name'],
  ];

  test('Should suggest macros', async () => {
    // arrange
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);

    // act
    const actualCompletionList = await triggerCompletion(docUri, new Position(0, 15), 'e');

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
    await assertCompletions(docUri, new Position(0, 89), getMacrosCompletionList());
  });

  function getMacrosCompletionList(): CompletionItem[] {
    return getMacrosCompletions().map<CompletionItem>(c => ({ label: c[0], insertText: c[1], kind: CompletionItemKind.Value }));
  }

  function getMacrosCompletions(): [string, string][] {
    return MACROS_COMPLETIONS;
  }
});
