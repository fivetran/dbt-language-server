import assert = require('assert');
import { Position, Range } from 'vscode';
import { activateAndWait, getDocUri, triggerDefinition } from './helper';

suite('ref definitions', () => {
  test('Should suggest definitions for ref without package', async () => {
    // arrange
    const docUri = getDocUri('ref_sql.sql');
    await activateAndWait(docUri);

    // act
    const definitions = await triggerDefinition(docUri, new Position(1, 24));

    // assert
    assert.strictEqual(definitions.length, 1);
    assert.ok(definitions[0].targetUri.path.endsWith('/test-fixture/models/table_exists.sql'));
    assert.deepStrictEqual(definitions[0].originSelectionRange, new Range(new Position(1, 19), new Position(1, 31)));
  });

  test('Should suggest definitions for ref with package', async () => {
    // arrange
    const docUri = getDocUri('package_ref.sql');
    await activateAndWait(docUri);

    // act
    const packageDefinitions = await triggerDefinition(docUri, new Position(1, 24));
    const modelDefinitions = await triggerDefinition(docUri, new Position(1, 42));

    // assert
    assert.ok(packageDefinitions.length > 1);
    assert.deepStrictEqual(packageDefinitions[0].originSelectionRange, new Range(new Position(1, 19), new Position(1, 33)));

    assert.strictEqual(modelDefinitions.length, 1);
    assert.ok(modelDefinitions[0].targetUri.path.endsWith('/test-fixture/models/table_exists.sql'));
    assert.deepStrictEqual(modelDefinitions[0].originSelectionRange, new Range(new Position(1, 37), new Position(1, 49)));
  });
});

// suite('macro definitions', () => {});

// suite('source definitions', () => {});
