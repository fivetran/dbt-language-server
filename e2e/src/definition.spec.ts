import * as fs from 'fs';
import { Position, Range } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWaitManifestParsed, getCustomDocUri, getDocUri, MAX_RANGE, MIN_RANGE, TEST_FIXTURE_PATH } from './helper';
import path = require('path');

const REF_SQL_DOC_URI = getDocUri('ref_sql.sql');
const PACKAGE_REF_DOC_URI = getDocUri('package_ref.sql');

suite('ref definitions', () => {
  test('Should suggest definitions for ref without package', async () => {
    await activateAndWaitManifestParsed(REF_SQL_DOC_URI, TEST_FIXTURE_PATH);
    await assertDefinitions(REF_SQL_DOC_URI, new Position(1, 24), [
      {
        originSelectionRange: new Range(1, 19, 1, 31),
        targetUri: getDocUri('table_exists.sql'),
        targetRange: MAX_RANGE,
        targetSelectionRange: MIN_RANGE,
      },
    ]);
  });

  test('Should suggest definitions for ref with package', async () => {
    await activateAndWaitManifestParsed(PACKAGE_REF_DOC_URI, TEST_FIXTURE_PATH);

    await assertDefinitions(
      PACKAGE_REF_DOC_URI,
      new Position(5, 24),
      getTestFixtureModels().map(m => {
        return {
          originSelectionRange: new Range(5, 19, 5, 33),
          targetUri: getDocUri(m),
          targetRange: MAX_RANGE,
          targetSelectionRange: MAX_RANGE,
        };
      }),
    );

    await assertDefinitions(PACKAGE_REF_DOC_URI, new Position(5, 42), [
      {
        originSelectionRange: new Range(5, 37, 5, 49),
        targetUri: getDocUri('table_exists.sql'),
        targetRange: MAX_RANGE,
        targetSelectionRange: MIN_RANGE,
      },
    ]);
  });
});

suite('macro definitions', () => {
  test('Should suggest definitions for macros', async () => {
    await activateAndWaitManifestParsed(PACKAGE_REF_DOC_URI, TEST_FIXTURE_PATH);

    await assertDefinitions(PACKAGE_REF_DOC_URI, new Position(2, 9), [
      {
        originSelectionRange: new Range(2, 7, 2, 25),
        targetUri: getCustomDocUri('test-fixture/macros/name_utils.sql'),
        targetRange: new Range(0, 0, 2, 14),
        targetSelectionRange: new Range(0, 9, 0, 9),
      },
    ]);

    await assertDefinitions(PACKAGE_REF_DOC_URI, new Position(3, 9), [
      {
        originSelectionRange: new Range(3, 7, 3, 24),
        targetUri: getCustomDocUri('test-fixture/macros/name_utils.sql'),
        targetRange: new Range(4, 0, 6, 14),
        targetSelectionRange: new Range(4, 9, 4, 9),
      },
    ]);
  });
});

suite('source definitions', () => {
  test('Should suggest definitions for source', async () => {
    await activateAndWaitManifestParsed(PACKAGE_REF_DOC_URI, TEST_FIXTURE_PATH);

    await assertDefinitions(PACKAGE_REF_DOC_URI, new Position(4, 33), [
      {
        originSelectionRange: new Range(4, 31, 4, 36),
        targetUri: getDocUri('sources/new_project.yml'),
        targetRange: new Range(9, 14, 9, 19),
        targetSelectionRange: new Range(9, 14, 9, 19),
      },
    ]);
  });
});

let testFixtureModels: string[] = [];
function getTestFixtureModels(): string[] {
  if (testFixtureModels.length === 0) {
    testFixtureModels = fs.readdirSync(path.resolve(TEST_FIXTURE_PATH, 'models')).filter(f => f.endsWith('.sql'));
  }
  return testFixtureModels;
}
