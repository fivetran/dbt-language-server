import * as vscode from 'vscode';
import { activateAndWait, getCustomDocUri, replaceText, testCompletion } from './helper';

suite('Should suggest completions after ref aliases', () => {
  const PROJECT_FILE_NAME = 'completion-ref/models/join_ref.sql';

  test('Should suggest columns for ref alias after press .', async () => {
    // arrange
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await replaceText('*', 'u');

    // act
    await testCompletion(
      docUri,
      new vscode.Position(7, 9),
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
});
