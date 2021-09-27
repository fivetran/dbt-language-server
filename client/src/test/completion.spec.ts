import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activateAndWait, sleep } from './helper';

suite('Should do completion', async () => {
  const docUri = getDocUri('completion.sql');

  test('Should suggest table colums', async () => {
    await testCompletion(docUri, new vscode.Position(0, 8), {
      items: [
        { label: 'date', kind: vscode.CompletionItemKind.Value },
        { label: 'id', kind: vscode.CompletionItemKind.Value },
        { label: 'name', kind: vscode.CompletionItemKind.Value },
        { label: 'time', kind: vscode.CompletionItemKind.Value },
      ],
    });
  });
});

async function testCompletion(docUri: vscode.Uri, position: vscode.Position, expectedCompletionList: vscode.CompletionList) {
  await activateAndWait(docUri);

  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualCompletionList = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position,
  )) as vscode.CompletionList;

  assert.ok(actualCompletionList.items.length >= 4);
  expectedCompletionList.items.forEach((expectedItem, i) => {
    const actualItem = actualCompletionList.items[i];
    assert.strictEqual(actualItem.label, expectedItem.label);
    assert.strictEqual(actualItem.kind, expectedItem.kind);
  });
}
