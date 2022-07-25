import * as vscode from 'vscode';
import { assertCompletions } from './asserts';
import { getDocUri, openAndWaitDiagnostics } from './helper';

suite('Should do completion with jinjas in query', () => {
  test('Should suggest table columns', async () => {
    const docUri = getDocUri('simple_select_dbt.sql');
    await openAndWaitDiagnostics(docUri);

    await assertCompletions(docUri, new vscode.Position(0, 8), [
      { label: 'date', kind: vscode.CompletionItemKind.Value },
      { label: 'id', kind: vscode.CompletionItemKind.Value },
      { label: 'name', kind: vscode.CompletionItemKind.Value },
      { label: 'time', kind: vscode.CompletionItemKind.Value },
    ]);
  });
});
