import * as vscode from 'vscode';
import { assertCompletions, assertCompletionsContain } from './asserts';
import { activateAndWait, getDocUri, replaceText } from './helper';

suite('Should do completion', () => {
  test('Should suggest table columns', async () => {
    const docUri = getDocUri('simple_select.sql');
    await activateAndWait(docUri);

    await assertCompletions(docUri, new vscode.Position(0, 8), [
      { label: 'date', kind: vscode.CompletionItemKind.Value },
      { label: 'id', kind: vscode.CompletionItemKind.Value },
      { label: 'name', kind: vscode.CompletionItemKind.Value },
      { label: 'time', kind: vscode.CompletionItemKind.Value },
    ]);
  });

  test('Should suggest columns for both tables', async () => {
    const docUri = getDocUri('join_tables.sql');
    await activateAndWait(docUri);

    await assertCompletions(docUri, new vscode.Position(0, 8), [
      { label: 'test_table1.date', kind: vscode.CompletionItemKind.Value },
      { label: 'test_table1.id', kind: vscode.CompletionItemKind.Value },
      { label: 'test_table1.name', kind: vscode.CompletionItemKind.Value },
      { label: 'test_table1.time', kind: vscode.CompletionItemKind.Value },

      { label: 'users.division', kind: vscode.CompletionItemKind.Value },
      { label: 'users.email', kind: vscode.CompletionItemKind.Value },
      { label: 'users.id', kind: vscode.CompletionItemKind.Value },
      { label: 'users.name', kind: vscode.CompletionItemKind.Value },
      { label: 'users.phone', kind: vscode.CompletionItemKind.Value },
      { label: 'users.profile_id', kind: vscode.CompletionItemKind.Value },
      { label: 'users.referrer_id', kind: vscode.CompletionItemKind.Value },
      { label: 'users.role', kind: vscode.CompletionItemKind.Value },
    ]);
  });

  test('Should suggest columns for table name after press .', async () => {
    const docUri = getDocUri('join_tables.sql');
    await activateAndWait(docUri);
    await replaceText('*', 'users.');

    await assertCompletions(
      docUri,
      new vscode.Position(0, 13),
      [
        { label: 'division', kind: vscode.CompletionItemKind.Value },
        { label: 'email', kind: vscode.CompletionItemKind.Value },
        { label: 'id', kind: vscode.CompletionItemKind.Value },
        { label: 'name', kind: vscode.CompletionItemKind.Value },
        { label: 'phone', kind: vscode.CompletionItemKind.Value },
        { label: 'profile_id', kind: vscode.CompletionItemKind.Value },
        { label: 'referrer_id', kind: vscode.CompletionItemKind.Value },
        { label: 'role', kind: vscode.CompletionItemKind.Value },
      ],
      '.',
    );
  });

  test('Should suggest columns for table alias after press .', async () => {
    const docUri = getDocUri('select_with_alias.sql');
    await activateAndWait(docUri);
    await replaceText('*', 't.');

    await assertCompletions(
      docUri,
      new vscode.Position(0, 9),
      [
        { label: 'date', kind: vscode.CompletionItemKind.Value },
        { label: 'id', kind: vscode.CompletionItemKind.Value },
        { label: 'name', kind: vscode.CompletionItemKind.Value },
        { label: 'time', kind: vscode.CompletionItemKind.Value },
      ],
      '.',
    );
  });

  test('Should suggest columns from with clause', async () => {
    const docUri = getDocUri('multiple_with.sql');
    await activateAndWait(docUri);

    await assertCompletionsContain(docUri, new vscode.Position(7, 7), [
      { label: 'aaa_table.column1', insertText: 'aaa_table.column1', kind: vscode.CompletionItemKind.Value, detail: 'INT64' },
      { label: 'aaa_table.column2', insertText: 'aaa_table.column2', kind: vscode.CompletionItemKind.Value, detail: 'INT64' },
      { label: 'bbb_table.column3', insertText: 'bbb_table.column3', kind: vscode.CompletionItemKind.Value, detail: 'INT64' },
    ]);
  });

  test('Should suggest tables from with clause', async () => {
    const docUri = getDocUri('multiple_with.sql');
    await activateAndWait(docUri);
    await replaceText('from aaa_table', 'from ');

    await assertCompletionsContain(docUri, new vscode.Position(7, 14), [
      { label: 'aaa_table', kind: vscode.CompletionItemKind.Value, detail: 'Table' },
      { label: 'bbb_table', kind: vscode.CompletionItemKind.Value, detail: 'Table' },
    ]);
  });
});
