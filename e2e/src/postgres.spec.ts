import { assertThat, instanceOf } from 'hamjest';
import { commands, MarkdownString, Position, Range, SignatureHelp } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, activateAndWaitServerReady, getCustomDocUri, getPreviewText, MAX_RANGE, MIN_RANGE, POSTGRES_PATH } from './helper';

const ACTIVE_USERS_URI = getCustomDocUri('postgres/models/active_users.sql');
const ORDERS_COUNT_DOC_URI = getCustomDocUri('postgres/models/active_users_orders_count.sql');

suite('Postgres destination', () => {
  test('Should compile postgres documents', async () => {
    await activateAndWait(ACTIVE_USERS_URI);

    assertThat(
      getPreviewText(),
      `select *\nfrom "postgres"."users_orders"."users" u\nwhere exists (select * from "postgres"."users_orders"."orders" o where o.user_id = u.id)`,
    );
  });

  test('Should provide ref definitions', async () => {
    await activateAndWaitServerReady(ORDERS_COUNT_DOC_URI, POSTGRES_PATH);

    await assertDefinitions(ORDERS_COUNT_DOC_URI, new Position(1, 40), [
      {
        originSelectionRange: new Range(1, 34, 1, 46),
        targetUri: ACTIVE_USERS_URI,
        targetRange: MAX_RANGE,
        targetSelectionRange: MIN_RANGE,
      },
    ]);

    await assertDefinitions(ORDERS_COUNT_DOC_URI, new Position(1, 20), [
      {
        originSelectionRange: new Range(1, 13, 1, 30),
        targetUri: ACTIVE_USERS_URI,
        targetRange: MAX_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
      {
        originSelectionRange: new Range(1, 13, 1, 30),
        targetUri: getCustomDocUri('postgres/models/active_users_orders_count.sql'),
        targetRange: MAX_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
    ]);
  });

  test('Should provide macro definitions', async () => {
    await activateAndWaitServerReady(ORDERS_COUNT_DOC_URI, POSTGRES_PATH);

    await assertDefinitions(ORDERS_COUNT_DOC_URI, new Position(0, 24), [
      {
        originSelectionRange: new Range(0, 16, 0, 34),
        targetUri: getCustomDocUri('postgres/macros/name_parts.sql'),
        targetRange: new Range(0, 0, 2, 14),
        targetSelectionRange: new Range(0, 9, 0, 9),
      },
    ]);
  });

  test('Should provide source definitions', async () => {
    await activateAndWaitServerReady(ACTIVE_USERS_URI, POSTGRES_PATH);
    await assertDefinitions(ACTIVE_USERS_URI, new Position(1, 34), [
      {
        originSelectionRange: new Range(1, 32, 1, 37),
        targetUri: getCustomDocUri('postgres/models/sources/users_orders.yml'),
        targetRange: new Range(20, 14, 20, 19),
        targetSelectionRange: new Range(20, 14, 20, 19),
      },
    ]);
  });

  test('Should provide signature help for COUNT function', async () => {
    // arrange
    await activateAndWaitServerReady(ORDERS_COUNT_DOC_URI, POSTGRES_PATH);

    // act
    const help = await commands.executeCommand<SignatureHelp>('vscode.executeSignatureHelpProvider', ORDERS_COUNT_DOC_URI, new Position(0, 145), '(');

    // assert
    assertThat(help.signatures.length, 2);

    assertThat(help.signatures[0].label, 'COUNT(*)  [OVER (...)]\n');
    assertThat(help.signatures[0].documentation, instanceOf(MarkdownString));
    assertThat((help.signatures[0].documentation as MarkdownString).value, 'Returns the number of rows in the input.');

    assertThat(help.signatures[1].label, 'COUNT(\n  [DISTINCT]\n  expression\n  [HAVING {MAX | MIN} expression2]\n)\n[OVER (...)]\n');
    assertThat(help.signatures[1].documentation, instanceOf(MarkdownString));
    assertThat(
      (help.signatures[1].documentation as MarkdownString).value,
      'Returns the number of rows with `expression` evaluated to any value other\nthan `NULL`.',
    );
  });
});
