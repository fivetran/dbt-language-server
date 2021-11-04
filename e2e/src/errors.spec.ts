import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateAndWait, getDocUri, insertText, sleep } from './helper';

suite('Errors', () => {
  const docUri = getDocUri('errors.sql');

  test('Should show error', async () => {
    // arrange
    await activateAndWait(docUri);

    // assert,
    await testDiagnostics(docUri, [new vscode.Diagnostic(new vscode.Range(0, 8, 0, 12), 'Syntax error: SELECT list must not be empty')]);
  });

  test('Should show no errors after fix query', async () => {
    // arrange
    await activateAndWait(docUri);

    // act
    await insertText(new vscode.Position(0, 7), '*');

    // assert
    await sleep(1000);
    await testDiagnostics(docUri, []);
  });

  function testDiagnostics(docUri: vscode.Uri, diagnostics: vscode.Diagnostic[]) {
    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

    assert.strictEqual(actualDiagnostics.length, diagnostics.length);
    if (diagnostics.length === 1) {
      assert.strictEqual(actualDiagnostics[0].message, 'Syntax error: SELECT list must not be empty');
      assert.deepStrictEqual(actualDiagnostics[0].range, new vscode.Range(0, 8, 0, 12));
    }
  }
});
