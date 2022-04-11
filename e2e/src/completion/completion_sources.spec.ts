import { CompletionItem, CompletionItemKind, Position } from 'vscode';
import { assertCompletions } from '../asserts';
import { activateAndWait, getCustomDocUri, getTextInQuotesIfNeeded } from '../helper';

suite('Should suggest sources completions', () => {
  const PROJECT_FILE_NAME = 'postgres/models/active_users.sql';

  const SOURCES_COMPLETIONS: [string, string][] = [['(dbt_postgres_test) users_orders', 'users_orders']];
  const TABLES_COMPLETIONS: [string, string][] = [
    ['orders', 'orders'],
    ['users', 'users'],
  ];

  test('Should suggest sources', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await assertCompletions(docUri, new Position(1, 16), getSourcesCompletionList(SOURCES_COMPLETIONS, false));
  });

  test('Should suggest source tables', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await assertCompletions(docUri, new Position(1, 32), getSourcesCompletionList(TABLES_COMPLETIONS, false));
  });

  function getSourcesCompletionList(completions: [string, string][], withQuotes: boolean): CompletionItem[] {
    return completions.map<CompletionItem>(c => ({
      label: c[0],
      insertText: getTextInQuotesIfNeeded(c[1], withQuotes),
      kind: CompletionItemKind.Value,
    }));
  }
});
