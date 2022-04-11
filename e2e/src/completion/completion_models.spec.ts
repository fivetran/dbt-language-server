import { assertThat, contains, not } from 'hamjest';
import * as vscode from 'vscode';
import { CompletionItem, CompletionItemKind } from 'vscode';
import { assertCompletions } from '../asserts';
import { activateAndWait, getCustomDocUri, getTextInQuotesIfNeeded, setTestContent, triggerCompletion } from '../helper';

suite('Should suggest model completions', () => {
  const PROJECT_FILE_NAME = 'completion-jinja/models/completion_jinja.sql';

  const MODELS_COMPLETIONS: [string, string][] = [
    ['(my_new_project) completion_jinja', 'completion_jinja'],
    ['(my_new_project) join_ref', 'join_ref'],
    ['(my_new_project) test_table1', 'test_table1'],
    ['(my_new_project) users', 'users'],
  ];

  test('Should suggest models for ref function by pressing "("', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await setTestContent('select * from {{ref(');
    await assertCompletions(docUri, new vscode.Position(0, 20), getCompletionList(true), '(');
  });

  test('Should suggest models for ref function', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await setTestContent('select * from {{ref(');
    await assertCompletions(docUri, new vscode.Position(0, 20), getCompletionList(true));
  });

  test("Should suggest models for ref function by pressing ' ", async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await setTestContent(`select * from {{ref('`);
    await assertCompletions(docUri, new vscode.Position(0, 21), getCompletionList(false), "'");
  });

  test('Should not suggest models outside jinja', async () => {
    // arrange
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await setTestContent(`select * from {{}}ref('`);

    // act
    const actualCompletionList = await triggerCompletion(docUri, new vscode.Position(0, 22));

    // assert
    actualCompletionList.items.forEach(i => i.label instanceof String);
    const actualLabels = actualCompletionList.items.map(i => i.label as string);
    getCompletionList(false).forEach(i => assertThat(actualLabels, not(contains(i.label as string))));
    getCompletionList(true).forEach(i => assertThat(actualLabels, not(contains(i.label as string))));
  });

  function getCompletionList(withQuotes: boolean): CompletionItem[] {
    return MODELS_COMPLETIONS.map<CompletionItem>(c => ({
      label: c[0],
      insertText: getTextInQuotesIfNeeded(c[1], withQuotes),
      kind: CompletionItemKind.Value,
    }));
  }
});
