import { assertThat } from 'hamjest';
import * as vscode from 'vscode';
import { activateAndWait, getDocUri, insertText, sleep } from './helper';

suite('Errors', () => {
  const docUri = getDocUri('errors.sql');

  test('Should show error', async () => {
    // arrange
    await activateAndWait(docUri);

    // assert
    testDiagnostics(docUri, [new vscode.Diagnostic(new vscode.Range(0, 8, 0, 12), 'Syntax error: SELECT list must not be empty')]);
  });

  test('Should show no errors after fix query', async () => {
    // arrange
    await activateAndWait(docUri);

    // act
    await insertText(new vscode.Position(0, 7), '*');

    // assert
    await sleep(1000);
    testDiagnostics(docUri, []);
  });

  function testDiagnostics(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]): void {
    const actualDiagnostics = vscode.languages.getDiagnostics(uri);

    assertThat(actualDiagnostics.length, diagnostics.length);
    if (diagnostics.length === 1) {
      assertThat(actualDiagnostics[0].message, 'Syntax error: SELECT list must not be empty');
      assertThat(actualDiagnostics[0].range, new vscode.Range(0, 8, 0, 12));
    }
  }
});
