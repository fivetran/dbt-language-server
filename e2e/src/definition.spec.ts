import { Position, Range } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getCustomDocUri, getDocUri, MAX_RANGE } from './helper';

const refSqlDocUri = getDocUri('ref_sql.sql');
const packageRefDocUri = getDocUri('package_ref.sql');

suite('ref definitions', () => {
  test('Should suggest definitions for ref without package', async () => {
    await activateAndWait(refSqlDocUri);
    await assertDefinitions(refSqlDocUri, new Position(1, 24), [
      {
        originSelectionRange: new Range(1, 19, 1, 31),
        targetUri: getDocUri('table_exists.sql'),
        targetRange: MAX_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
    ]);
  });

  test('Should suggest definitions for ref with package', async () => {
    await activateAndWait(packageRefDocUri);

    await assertDefinitions(
      packageRefDocUri,
      new Position(5, 24),
      getTestFixtureModels().map(m => {
        return {
          originSelectionRange: new Range(5, 19, 5, 33),
          targetUri: getDocUri(`${m}.sql`),
          targetRange: MAX_RANGE,
          targetSelectionRange: MAX_RANGE,
        };
      }),
    );

    await assertDefinitions(packageRefDocUri, new Position(5, 42), [
      {
        originSelectionRange: new Range(5, 37, 5, 49),
        targetUri: getDocUri('table_exists.sql'),
        targetRange: MAX_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
    ]);
  });
});

suite('macro definitions', () => {
  test('Should suggest definitions for macros', async () => {
    await activateAndWait(packageRefDocUri);
    await assertDefinitions(packageRefDocUri, new Position(2, 9), [
      {
        originSelectionRange: new Range(2, 7, 2, 25),
        targetUri: getCustomDocUri('test-fixture/macros/name_utils.sql'),
        targetRange: new Range(0, 0, 2, 14),
        targetSelectionRange: new Range(0, 9, 0, 27),
      },
    ]);
    await assertDefinitions(packageRefDocUri, new Position(3, 9), [
      {
        originSelectionRange: new Range(3, 7, 3, 24),
        targetUri: getCustomDocUri('test-fixture/macros/name_utils.sql'),
        targetRange: new Range(4, 0, 6, 14),
        targetSelectionRange: new Range(4, 9, 4, 26),
      },
    ]);
  });
});

suite('source definitions', () => {
  test('Should suggest definitions for source', async () => {
    await activateAndWait(packageRefDocUri);
    await assertDefinitions(packageRefDocUri, new Position(4, 33), [
      {
        originSelectionRange: new Range(4, 31, 4, 36),
        targetUri: getDocUri('sources/new_project.yml'),
        targetRange: MAX_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
    ]);
  });
});

function getTestFixtureModels(): string[] {
  return [
    'dbt_compile',
    'errors',
    'functions',
    'jinja_sql',
    'join_tables',
    'package_ref',
    'ref_sql',
    'referrers',
    'select_with_alias',
    'simple_select',
    'simple_select_dbt',
    'sql_after_jinja',
    'table_exists',
  ];
}
