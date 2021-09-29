import * as vscode from 'vscode';
import { getDocUri, testCompletion } from './helper';

suite('Should do completion', async () => {
  test('Should suggest table colums', async () => {
    const docUri = getDocUri('simple_select.sql');
    await testCompletion(docUri, new vscode.Position(0, 8), {
      items: [
        { label: 'date', kind: vscode.CompletionItemKind.Value },
        { label: 'id', kind: vscode.CompletionItemKind.Value },
        { label: 'name', kind: vscode.CompletionItemKind.Value },
        { label: 'time', kind: vscode.CompletionItemKind.Value },
      ],
    });
  });

  test('Should suggest colums for both tables', async () => {
    const docUri = getDocUri('join_tables.sql');
    await testCompletion(docUri, new vscode.Position(0, 8), {
      items: [
        { label: 'test_table1.date', kind: vscode.CompletionItemKind.Value },
        { label: 'test_table1.id', kind: vscode.CompletionItemKind.Value },
        { label: 'test_table1.name', kind: vscode.CompletionItemKind.Value },
        { label: 'test_table1.time', kind: vscode.CompletionItemKind.Value },

        { label: 'user.division', kind: vscode.CompletionItemKind.Value },
        { label: 'user.email', kind: vscode.CompletionItemKind.Value },
        { label: 'user.id', kind: vscode.CompletionItemKind.Value },
        { label: 'user.name', kind: vscode.CompletionItemKind.Value },
        { label: 'user.phone', kind: vscode.CompletionItemKind.Value },
        { label: 'user.profile_id', kind: vscode.CompletionItemKind.Value },
        { label: 'user.role', kind: vscode.CompletionItemKind.Value },
      ],
    });
  });
});
