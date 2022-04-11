import { CompletionItem, CompletionItemKind, Position } from 'vscode';
import { assertCompletions } from '../asserts';
import { activateAndWait, getCustomDocUri, getTextInQuotesIfNeeded } from '../helper';

suite('Should suggest sources completions', () => {
  const PROJECT_FILE_NAME = 'postgres/models/active_users.sql';

  test('Should suggest sources', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await assertCompletions(docUri, new Position(1, 16), getSourcesCompletionList(getSourcesCompletions, false));
  });

  test('Should suggest source tables', async () => {
    const docUri = getCustomDocUri(PROJECT_FILE_NAME);
    await activateAndWait(docUri);
    await assertCompletions(docUri, new Position(1, 32), getSourcesCompletionList(getTablesCompletions, false));
  });

  function getSourcesCompletionList(getCompletions: (withQuotes: boolean) => [string, string][], withQuotes: boolean): CompletionItem[] {
    return getCompletions(withQuotes).map<CompletionItem>(c => ({ label: c[0], insertText: c[1], kind: CompletionItemKind.Value }));
  }

  function getSourcesCompletions(withQuotes: boolean): [string, string][] {
    return [['(dbt_postgres_test) users_orders', getTextInQuotesIfNeeded('users_orders', withQuotes)]];
  }

  function getTablesCompletions(withQuotes: boolean): [string, string][] {
    return [
      ['orders', getTextInQuotesIfNeeded('orders', withQuotes)],
      ['users', getTextInQuotesIfNeeded('users', withQuotes)],
    ];
  }
});
