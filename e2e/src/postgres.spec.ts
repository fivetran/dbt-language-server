import { assertThat } from 'hamjest';
import { Position, Range } from 'vscode';
import { activateAndWait, assertDefinitions, getCustomDocUri, getPreviewText, MAX_RANGE } from './helper';

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
});
