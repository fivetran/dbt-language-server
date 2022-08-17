import { assertThat, hasSize } from 'hamjest';
import { Position } from 'vscode';
import { createAndOpenTempModel, executeSignatureHelpProvider, moveCursorLeft, setTestContent } from './helper';

suite('Signature help', () => {
  test('Should show function signature help', async () => {
    // arrange
    const uri = await createAndOpenTempModel('test-fixture', 'manifest');

    await setTestContent('select\n\n\ncount(*) from dbt_ls_e2e_dataset.test_table1');
    await moveCursorLeft();

    // act
    const signatureHelp = await executeSignatureHelpProvider(uri, new Position(4, 6));

    // assert
    assertThat(signatureHelp.signatures, hasSize(2));
  });
});
