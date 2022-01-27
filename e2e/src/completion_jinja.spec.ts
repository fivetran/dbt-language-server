import { assertThat, contains, not } from 'hamjest';
import * as vscode from 'vscode';
import { CompletionItem } from 'vscode';
import { activateAndWait, getCustomDocUri, setTestContent, testCompletion, triggerCompletion } from './helper';

suite('Should do completion inside jinjas expression', () => {
  const PROJECT_FILE_NAME = 'completion-jinja/models/completion_jinja.sql';

  test('Should suggest models for ref function by pressing "("', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await setTestContent('select * from {{ref(');
    await testCompletion(docUri, new vscode.Position(0, 20), getCompletionList(true), '(');
  });

  test('Should suggest models for ref function', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await setTestContent('select * from {{ref(');
    await testCompletion(docUri, new vscode.Position(0, 20), getCompletionList(true));
  });

  test("Should suggest models for ref function by pressing ' ", async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await setTestContent(`select * from {{ref('`);
    await testCompletion(docUri, new vscode.Position(0, 21), getCompletionList(false), "'");
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

  function getCompletionList(withQuotes: boolean): { items: vscode.CompletionItem[] } {
    return { items: getLabels().map<CompletionItem>(l => ({ label: withQuotes ? `'${l}'` : l, kind: vscode.CompletionItemKind.Value })) };
  }

  function getLabels(): string[] {
    return ['completion_jinja', 'join_ref', 'test_table1', 'users'];
  }
});
