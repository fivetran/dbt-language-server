import { assertThat, contains, not } from 'hamjest';
import * as vscode from 'vscode';
import { CompletionItem, CompletionItemKind } from 'vscode';
import { assertCompletions } from '../asserts';
import { activateAndWait, getCustomDocUri, getTextInQuotesIfNeeded, setTestContent, triggerCompletion } from '../helper';

suite('Should suggest model completions', () => {
  const PROJECT_FILE_NAME = 'completion-jinja/models/completion_jinja.sql';

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
    getCompletionList(false).items.forEach(i => assertThat(actualLabels, not(contains(i.label as string))));
    getCompletionList(true).items.forEach(i => assertThat(actualLabels, not(contains(i.label as string))));
  });

  function getCompletionList(withQuotes: boolean): { items: CompletionItem[] } {
    return {
      items: getCompletions(withQuotes).map<CompletionItem>(c => ({ label: c[0], insertText: c[1], kind: CompletionItemKind.Value })),
    };
  }

  function getCompletions(withQuotes: boolean): [string, string][] {
    return [
      ['(my_new_project) completion_jinja', getTextInQuotesIfNeeded('completion_jinja', withQuotes)],
      ['(my_new_project) join_ref', getTextInQuotesIfNeeded('join_ref', withQuotes)],
      ['(my_new_project) test_table1', getTextInQuotesIfNeeded('test_table1', withQuotes)],
      ['(my_new_project) users', getTextInQuotesIfNeeded('users', withQuotes)],
    ];
  }
});
