import assert = require('assert');
import { Position, Range } from 'vscode';
import { activateAndWait, getDocUri, triggerDefinition } from './helper';

const refSqlDocUri = getDocUri('ref_sql.sql');
const packageRefDocUri = getDocUri('package_ref.sql');

suite('ref definitions', () => {
  test('Should suggest definitions for ref without package', async () => {
    // arrange
    await activateAndWait(refSqlDocUri);

    // act
    const definitions = await triggerDefinition(refSqlDocUri, new Position(1, 24));

    // assert
    assert.strictEqual(definitions.length, 1);
    assert.ok(definitions[0].targetUri.path.endsWith('/test-fixture/models/table_exists.sql'));
    assert.deepStrictEqual(definitions[0].originSelectionRange, new Range(new Position(1, 19), new Position(1, 31)));
  });

  test('Should suggest definitions for ref with package', async () => {
    // arrange
    await activateAndWait(packageRefDocUri);

    // act
    const packageDefinitions = await triggerDefinition(packageRefDocUri, new Position(5, 24));
    const modelDefinitions = await triggerDefinition(packageRefDocUri, new Position(5, 42));

    // assert
    assert.ok(packageDefinitions.length > 1);
    assert.deepStrictEqual(packageDefinitions[0].originSelectionRange, new Range(new Position(5, 19), new Position(5, 33)));

    assert.strictEqual(modelDefinitions.length, 1);
    assert.ok(modelDefinitions[0].targetUri.path.endsWith('/test-fixture/models/table_exists.sql'));
    assert.deepStrictEqual(modelDefinitions[0].originSelectionRange, new Range(new Position(5, 37), new Position(5, 49)));
  });
});

suite('macro definitions', () => {
  test('Should suggest definitions for macros', async () => {
    // arrange
    await activateAndWait(packageRefDocUri);

    // act
    const extractFirstNameDefinitions = await triggerDefinition(packageRefDocUri, new Position(2, 9));
    const extractLastNameDefinitions = await triggerDefinition(packageRefDocUri, new Position(3, 9));

    // assert
    assert.strictEqual(extractFirstNameDefinitions.length, 1);
    assert.ok(extractFirstNameDefinitions[0].targetUri.path.endsWith('/test-fixture/macros/name_utils.sql'));
    assert.deepStrictEqual(extractFirstNameDefinitions[0].originSelectionRange, new Range(new Position(2, 7), new Position(2, 25)));
    assert.deepStrictEqual(extractFirstNameDefinitions[0].targetSelectionRange, new Range(new Position(0, 9), new Position(0, 27)));
    assert.deepStrictEqual(extractFirstNameDefinitions[0].targetRange, new Range(new Position(0, 0), new Position(2, 14)));

    assert.strictEqual(extractLastNameDefinitions.length, 1);
    assert.ok(extractLastNameDefinitions[0].targetUri.path.endsWith('/test-fixture/macros/name_utils.sql'));
    assert.deepStrictEqual(extractLastNameDefinitions[0].originSelectionRange, new Range(new Position(3, 7), new Position(3, 24)));
    assert.deepStrictEqual(extractLastNameDefinitions[0].targetSelectionRange, new Range(new Position(4, 9), new Position(4, 26)));
    assert.deepStrictEqual(extractLastNameDefinitions[0].targetRange, new Range(new Position(4, 0), new Position(6, 14)));
  });
});

suite('source definitions', () => {
  test('Should suggest definitions for source', async () => {
    // arrange
    await activateAndWait(packageRefDocUri);

    // act
    const sourceDefinitions = await triggerDefinition(packageRefDocUri, new Position(4, 33));

    // assert
    assert.strictEqual(sourceDefinitions.length, 1);
    assert.ok(sourceDefinitions[0].targetUri.path.endsWith('/test-fixture/models/sources/new_project.yml'));
    assert.deepStrictEqual(sourceDefinitions[0].originSelectionRange, new Range(new Position(4, 31), new Position(4, 36)));
  });
});
