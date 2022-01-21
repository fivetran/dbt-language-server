import * as vscode from 'vscode';
import { activateAndWait, getDocUri, testCompletion } from './helper';

suite('Should do completion with jinjas in query', () => {
  test('Should suggest table columns', async () => {
    const docUri = getDocUri('simple_select_dbt.sql');
    await activateAndWait(docUri);

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
