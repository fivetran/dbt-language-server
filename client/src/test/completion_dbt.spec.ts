import * as vscode from 'vscode';
import { getDocUri, testCompletion } from './helper';

suite('Should do completion with jinjas in query', () => {
  const docUri = getDocUri('simple_select_dbt.sql');

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
