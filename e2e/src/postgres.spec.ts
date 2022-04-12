import { assertThat, instanceOf } from 'hamjest';
import { commands, MarkdownString, Position, Range, SignatureHelp } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getCustomDocUri, getPreviewText, MAX_RANGE } from './helper';

const activeUsersDocUri = getCustomDocUri('postgres/models/active_users.sql');
const activeUsersOrdersCountDocUri = getCustomDocUri('postgres/models/active_users_orders_count.sql');

suite('Postgres destination', () => {
  test('Should compile postgres documents', async () => {
    await activateAndWait(activeUsersDocUri);

    assertThat(
      getPreviewText(),
      `select *\nfrom "postgres"."users_orders"."users" u\nwhere exists (select * from "postgres"."users_orders"."orders" o where o.user_id = u.id)`,
    );
  });

  test('Should provide ref definitions', async () => {
    await activateAndWait(activeUsersOrdersCountDocUri);

    await assertDefinitions(activeUsersOrdersCountDocUri, new Position(1, 40), [
      {
        originSelectionRange: new Range(1, 34, 1, 46),
        targetUri: activeUsersDocUri,
        targetRange: MAX_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
    ]);

    await assertDefinitions(activeUsersOrdersCountDocUri, new Position(1, 20), [
      {
        originSelectionRange: new Range(1, 13, 1, 30),
        targetUri: activeUsersDocUri,
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
    await activateAndWait(activeUsersOrdersCountDocUri);

    await assertDefinitions(activeUsersOrdersCountDocUri, new Position(0, 24), [
      {
        originSelectionRange: new Range(0, 16, 0, 34),
        targetUri: getCustomDocUri('postgres/macros/name_parts.sql'),
        targetRange: new Range(0, 0, 2, 14),
        targetSelectionRange: new Range(0, 9, 0, 27),
      },
    ]);
  });

  test('Should provide source definitions', async () => {
    await activateAndWait(activeUsersDocUri);
    await assertDefinitions(activeUsersDocUri, new Position(1, 34), [
      {
        originSelectionRange: new Range(1, 32, 1, 37),
        targetUri: getCustomDocUri('postgres/models/sources/users_orders.yml'),
        targetRange: MAX_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
    ]);
  });

  test('Should provide signature help for COUNT function', async () => {
    // arrange
    await activateAndWait(activeUsersOrdersCountDocUri);

    // act
    const help = await commands.executeCommand<SignatureHelp>(
      'vscode.executeSignatureHelpProvider',
      activeUsersOrdersCountDocUri,
      new Position(0, 145),
      '(',
    );

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
