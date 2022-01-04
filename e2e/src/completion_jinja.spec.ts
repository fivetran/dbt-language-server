import * as assert from 'assert';
import * as vscode from 'vscode';
import { CompletionItem } from 'vscode';
import { activateAndWait, getCustomDocUri, getManifestModels, setTestContent, testCompletion, triggerCompletion } from './helper';

suite('Should do completion inside jinjas expression', () => {
  const PROJECT_FOLDER = 'completion-jinja';
  const PROJECT_FILE_NAME = 'completion-jinja/models/completion_jinja.sql';

  let models: string[];

  test('Should suggest models for ref function by pressing "("', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await setTestContent('select * from {{ref(');

    models = getManifestModels(PROJECT_FOLDER);
    await testCompletion(docUri, new vscode.Position(0, 20), getCompletionList(true), '(');
  });

  test('Should suggest models for ref function', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await setTestContent('select * from {{ref(');

    models = getManifestModels(PROJECT_FOLDER);
    await testCompletion(docUri, new vscode.Position(0, 20), getCompletionList(true));
  });

  test('Should suggest models for ref function by pressing "\'"', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await setTestContent(`select * from {{ref('`);

    models = getManifestModels(PROJECT_FOLDER);
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
    const actualLabels = actualCompletionList.items.map(i => <string>i.label);

    models = getManifestModels(PROJECT_FOLDER);
    getCompletionList(false).items.forEach(i => assert.ok(!actualLabels.includes(<string>i.label)));
    getCompletionList(true).items.forEach(i => assert.ok(!actualLabels.includes(<string>i.label)));
  });

  function getCompletionList(withQuotes: boolean): { items: vscode.CompletionItem[] } {
    return { items: models.map(l => <CompletionItem>{ label: withQuotes ? `'${l}'` : l, kind: vscode.CompletionItemKind.Value }) };
  }
});
