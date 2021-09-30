import * as vscode from 'vscode';
import { activateAndWait, getDocUri, replaceText, sleep, testCompletion } from './helper';

suite('Should do completion', async () => {
  test('Should suggest table colums', async () => {
    const docUri = getDocUri('simple_select.sql');
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

  test('Should suggest colums for both tables', async () => {
    const docUri = getDocUri('join_tables.sql');
    await activateAndWait(docUri);

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

  test('Should suggest colums for table name after press .', async () => {
    const docUri = getDocUri('join_tables.sql');
    await activateAndWait(docUri);
    await replaceText(new vscode.Range(0, 7, 0, 8), 'user.');

    await testCompletion(
      docUri,
      new vscode.Position(0, 12),
      {
        items: [
          { label: 'division', kind: vscode.CompletionItemKind.Value },
          { label: 'email', kind: vscode.CompletionItemKind.Value },
          { label: 'id', kind: vscode.CompletionItemKind.Value },
          { label: 'name', kind: vscode.CompletionItemKind.Value },
          { label: 'phone', kind: vscode.CompletionItemKind.Value },
          { label: 'profile_id', kind: vscode.CompletionItemKind.Value },
          { label: 'role', kind: vscode.CompletionItemKind.Value },
        ],
      },
      '.',
    );
  });

  test('Should suggest colums for table alias after press .', async () => {
    const docUri = getDocUri('select_with_alias.sql');
    await activateAndWait(docUri);
    await replaceText(new vscode.Range(0, 7, 0, 8), 't.');

    await testCompletion(
      docUri,
      new vscode.Position(0, 9),
      {
        items: [
          { label: 'date', kind: vscode.CompletionItemKind.Value },
          { label: 'id', kind: vscode.CompletionItemKind.Value },
          { label: 'name', kind: vscode.CompletionItemKind.Value },
          { label: 'time', kind: vscode.CompletionItemKind.Value },
        ],
      },
      '.',
    );
  });
});
