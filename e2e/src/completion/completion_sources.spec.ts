import { CompletionItem, CompletionItemKind, Position } from 'vscode';
import { assertCompletions } from '../asserts';
import { activateAndWaitManifestParsed, getAbsolutePath, getCustomDocUri, getTextInQuotesIfNeeded } from '../helper';

suite('Should suggest sources completions', () => {
  const PROJECT = 'postgres';
  const PROJECT_ABSOLUTE_PATH = getAbsolutePath(PROJECT);
  const PROJECT_FILE_NAME = `${PROJECT}/models/active_users.sql`;

  const SOURCES_COMPLETIONS: [string, string][] = [['(dbt_postgres_test) users_orders', 'users_orders']];
  const TABLES_COMPLETIONS: [string, string][] = [
    ['orders', 'orders'],
    ['users', 'users'],
  ];

  test('Should suggest sources', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWaitManifestParsed(docUri, PROJECT_ABSOLUTE_PATH);
    await assertCompletions(docUri, new Position(1, 16), getSourcesCompletionList(SOURCES_COMPLETIONS, false, 'Source'));
  });

  test('Should suggest source tables', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWaitManifestParsed(docUri, PROJECT_ABSOLUTE_PATH);
    await assertCompletions(docUri, new Position(1, 32), getSourcesCompletionList(TABLES_COMPLETIONS, false, 'Table'));
  });

  function getSourcesCompletionList(completions: [string, string][], withQuotes: boolean, detail: 'Source' | 'Table'): CompletionItem[] {
    return completions.map<CompletionItem>(c => ({
      label: c[0],
      insertText: getTextInQuotesIfNeeded(c[1], withQuotes),
      kind: CompletionItemKind.Value,
      detail,
    }));
  }
});
