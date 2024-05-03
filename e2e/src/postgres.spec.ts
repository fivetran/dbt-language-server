import { assertThat, falsy, instanceOf, truthy } from 'hamjest';
import fs from 'node:fs';
import { MarkdownString, Position, Range } from 'vscode';
import { assertDefinitions } from './asserts';
import {
  MAX_RANGE,
  POSTGRES_PATH,
  activateAndWait,
  activateAndWaitManifestParsed,
  analyzeEntireProject,
  executeSignatureHelpProvider,
  getAbsolutePath,
  getCustomDocUri,
  getPreviewText,
  sleep,
} from './helper';
import path = require('node:path');

const ACTIVE_USERS_URI = getCustomDocUri('postgres/models/active_users.sql');
const ORDERS_COUNT_DOC_URI = getCustomDocUri('postgres/models/active_users_orders_count.sql');

suite('Postgres destination', () => {
  test('Should compile postgres project successfully', async () => {
    const targetFolder = getAbsolutePath('postgres/target');
    const manifest = path.resolve(targetFolder, 'manifest.json');
    try {
      fs.rmdirSync(targetFolder, { recursive: true });
    } catch {
      // Ignore
    }
    assertThat(fs.existsSync(targetFolder), falsy());

    await activateAndWaitManifestParsed(getCustomDocUri('postgres/dbt_project.yml'), POSTGRES_PATH);
    await analyzeEntireProject();
    while (!fs.existsSync(manifest)) {
      await sleep(300);
    }

    assertThat(fs.existsSync(manifest), truthy());
  });

  test('Should compile postgres documents', async () => {
    await activateAndWait(ACTIVE_USERS_URI);

    assertThat(
      getPreviewText(),
      'select *\nfrom "postgres"."users_orders"."users" u\nwhere exists (select * from "postgres"."users_orders"."orders" o where o.user_id = u.id)',
    );
  });

  test('Should provide ref definitions', async () => {
    await activateAndWaitManifestParsed(ORDERS_COUNT_DOC_URI, POSTGRES_PATH);

    await assertDefinitions(ORDERS_COUNT_DOC_URI, new Position(1, 40), [
      {
        originSelectionRange: new Range(1, 34, 1, 46),
        targetUri: ACTIVE_USERS_URI,
        targetRange: MAX_RANGE,
        targetSelectionRange: MAX_RANGE,
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
    await activateAndWaitManifestParsed(ORDERS_COUNT_DOC_URI, POSTGRES_PATH);

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
    await activateAndWaitManifestParsed(ACTIVE_USERS_URI, POSTGRES_PATH);
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
    await activateAndWaitManifestParsed(ORDERS_COUNT_DOC_URI, POSTGRES_PATH);

    // act
    const help = await executeSignatureHelpProvider(ORDERS_COUNT_DOC_URI, new Position(0, 145), '(');

    // assert
    assertThat(help.signatures.length, 2);

    assertThat(help.signatures[0].label, 'COUNT(*)\n[OVER over_clause]');
    assertThat(help.signatures[0].documentation, instanceOf(MarkdownString));
    assertThat((help.signatures[0].documentation as MarkdownString).value, 'Returns the number of rows in the input.');
    assertThat(help.signatures[0].parameters, [{ label: '*', documentation: undefined }]);

    assertThat(
      help.signatures[1].label,
      'COUNT(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
    );
    assertThat(help.signatures[1].documentation, instanceOf(MarkdownString));
    assertThat(
      (help.signatures[1].documentation as MarkdownString).value,
      'Returns the number of rows with `expression` evaluated to any value other\nthan `NULL`.',
    );
    assertThat(help.signatures[1].parameters, [
      { label: '[ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]', documentation: undefined },
    ]);
  });
});
