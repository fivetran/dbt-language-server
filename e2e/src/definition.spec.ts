import { assertThat, endsWith, greaterThan, hasSize, is } from 'hamjest';
import { DefinitionLink, Position, Range, Uri } from 'vscode';
import { activateAndWait, getDocUri, triggerDefinition } from './helper';

const MIN_RANGE = new Range(0, 0, 0, 0);
const MAX_RANGE = new Range(0, 0, 2147483647, 2147483647);

const refSqlDocUri = getDocUri('ref_sql.sql');
const packageRefDocUri = getDocUri('package_ref.sql');

suite('ref definitions', () => {
  test('Should suggest definitions for ref without package', async () => {
    // arrange
    await activateAndWait(refSqlDocUri);
    await assertDefinitions(refSqlDocUri, new Position(1, 24), [
      {
        originSelectionRange: new Range(1, 19, 1, 31),
        targetUri: getDocUri('/table_exists.sql'),
        targetRange: MIN_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
    ]);
  });

  test('Should suggest definitions for ref with package', async () => {
    // arrange
    await activateAndWait(packageRefDocUri);

    // act
    const packageDefinitions = await triggerDefinition(packageRefDocUri, new Position(5, 24));
    const modelDefinitions = await triggerDefinition(packageRefDocUri, new Position(5, 42));

    // assert
    assertThat(packageDefinitions.length, is(greaterThan(1)));
    assertThat(packageDefinitions[0].originSelectionRange, new Range(5, 19, 5, 33));

    assertThat(modelDefinitions, hasSize(1));
    assertThat(modelDefinitions[0].targetUri.path, endsWith('/test-fixture/models/table_exists.sql'));
    assertThat(modelDefinitions[0].originSelectionRange, new Range(5, 37, 5, 49));
  });
});

suite('macro definitions', () => {
  test('Should suggest definitions for macros', async () => {
    await activateAndWait(packageRefDocUri);
    await assertDefinitions(packageRefDocUri, new Position(2, 9), [
      {
        originSelectionRange: new Range(2, 7, 2, 25),
        targetUri: getDocUri('/macros/name_utils.sql'),
        targetRange: new Range(0, 0, 2, 14),
        targetSelectionRange: new Range(0, 9, 0, 27),
      },
    ]);
    await assertDefinitions(packageRefDocUri, new Position(3, 9), [
      {
        originSelectionRange: new Range(3, 7, 3, 24),
        targetUri: getDocUri('/macros/name_utils.sql'),
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
        targetUri: getDocUri('/sources/new_project.yml'),
        targetRange: MIN_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
    ]);
  });
});

async function assertDefinitions(docUri: Uri, position: Position, expectedDefinitions: DefinitionLink[]): Promise<void> {
  const definitions = await triggerDefinition(docUri, position);

  assertThat(definitions.length, expectedDefinitions.length);

  for (let i = 0; i < 0; i++) {
    assertThat(definitions[i].originSelectionRange, expectedDefinitions[i].originSelectionRange);
    assertThat(definitions[i].targetUri, expectedDefinitions[i].targetUri);
    assertThat(definitions[i].targetRange, expectedDefinitions[i].targetRange);
    assertThat(definitions[i].targetSelectionRange, expectedDefinitions[i].targetSelectionRange);
  }
}
