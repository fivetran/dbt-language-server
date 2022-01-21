import { assertThat } from 'hamjest';
import * as vscode from 'vscode';
import { Diagnostic, languages, Position, Range, Uri } from 'vscode';
import { activateAndWait, getDocUri, insertText, PREVIEW_URI, sleep } from './helper';

suite('Errors', () => {
  const docUri = getDocUri('errors.sql');
  const error = 'Syntax error: SELECT list must not be empty';

  test('Should show error', async () => {
    // arrange
    await activateAndWait(docUri);

    // assert
    testDiagnostics(docUri, [new Diagnostic(new Range(0, 8, 0, 12), error)]);
  });

  test('Should show no errors after fix query', async () => {
    // arrange
    await activateAndWait(docUri);

    // act
    await insertText(new Position(0, 7), '*');

    // assert
    await sleep(1000);
    testDiagnostics(docUri, []);
  });

  function testDiagnostics(uri: vscode.Uri, diagnostics: Diagnostic[]): void {
    const rawDocDiagnostics = languages.getDiagnostics(uri);
    const previewDiagnostics = languages.getDiagnostics(Uri.parse(PREVIEW_URI));

    assertThat(rawDocDiagnostics.length, diagnostics.length);
    assertThat(previewDiagnostics.length, diagnostics.length);

    if (diagnostics.length === 1) {
      assertThat(rawDocDiagnostics[0].message, 'Syntax error: SELECT list must not be empty');
      assertThat(rawDocDiagnostics[0].range, new vscode.Range(0, 8, 0, 12));

      assertThat(previewDiagnostics[0].message, error);
      assertThat(previewDiagnostics[0].range, new Range(0, 8, 0, 12));
    }
  }
});
