import assert = require('assert');
import { Position, Range } from 'vscode';
import { activateAndWait, getDocUri, triggerDefinition } from './helper';

suite('Should suggest definitions', () => {
  test('Should suggest definition with right target and origin selection', async () => {
    // arrange
    const docUri = getDocUri('ref_sql.sql');
    await activateAndWait(docUri);

    // act
    const definitions = await triggerDefinition(docUri, new Position(1, 24));

    // assert
    assert.strictEqual(definitions.length, 1);
    assert.ok(definitions[0].targetUri.path.endsWith('/test-fixture/models/table_exists.sql'));
    assert.deepStrictEqual(definitions[0].originSelectionRange, new Range(new Position(1, 11), new Position(1, 36)));
  });
});
