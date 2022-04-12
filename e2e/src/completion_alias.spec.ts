import * as vscode from 'vscode';
import { assertCompletions } from './asserts';
import { activateAndWait, getCustomDocUri } from './helper';

suite('Should suggest completions after ref aliases', () => {
  const PROJECT_FILE_NAME = 'completion-jinja/models/join_ref.sql';

  test('Should suggest columns for ref alias after press . in select', async () => {
    await shouldSuggestUsersTableColumns(new vscode.Position(7, 9));
  });

  test('Should suggest columns for ref alias after press . in join', async () => {
    await shouldSuggestUsersTableColumns(new vscode.Position(8, 44));
  });

  async function shouldSuggestUsersTableColumns(position: vscode.Position): Promise<void> {
    // arrange
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);

    // act
    await assertCompletions(
      docUri,
      position,
      [
        { label: 'division', kind: vscode.CompletionItemKind.Value },
        { label: 'email', kind: vscode.CompletionItemKind.Value },
        { label: 'id', kind: vscode.CompletionItemKind.Value },
        { label: 'name', kind: vscode.CompletionItemKind.Value },
        { label: 'phone', kind: vscode.CompletionItemKind.Value },
        { label: 'profile_id', kind: vscode.CompletionItemKind.Value },
        { label: 'role', kind: vscode.CompletionItemKind.Value },
      ],
      '.',
    );
  }
});
