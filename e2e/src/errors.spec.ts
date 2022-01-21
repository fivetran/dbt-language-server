import { assertThat } from 'hamjest';
import * as vscode from 'vscode';
import { Diagnostic, languages, Position, Range, Uri } from 'vscode';
import { activateAndWait, getDocUri, insertText, PREVIEW_URI, sleep } from './helper';

suite('Errors', () => {
  const DOC_URI = getDocUri('errors.sql');
  const ERROR = 'Syntax error: SELECT list must not be empty';

  test('Should show error', async () => {
    // arrange
    await activateAndWait(DOC_URI);

    // assert
    testDiagnostics(DOC_URI, [new Diagnostic(new Range(0, 8, 0, 12), ERROR)]);
  });

  test('Should show no errors after fix query', async () => {
    // arrange
    await activateAndWait(DOC_URI);

    // act
    await insertText(new Position(0, 7), '*');

    // assert
    await sleep(1000);
    testDiagnostics(DOC_URI, []);
  });

  function testDiagnostics(uri: vscode.Uri, diagnostics: Diagnostic[]): void {
    const rawDocDiagnostics = languages.getDiagnostics(uri);
    const previewDiagnostics = languages.getDiagnostics(Uri.parse(PREVIEW_URI));

    assertThat(rawDocDiagnostics.length, diagnostics.length);
    assertThat(previewDiagnostics.length, diagnostics.length);

    if (diagnostics.length === 1) {
      assertThat(rawDocDiagnostics[0].message, 'Syntax error: SELECT list must not be empty');
      assertThat(rawDocDiagnostics[0].range, new vscode.Range(0, 8, 0, 12));

      assertThat(previewDiagnostics[0].message, ERROR);
      assertThat(previewDiagnostics[0].range, new Range(0, 8, 0, 12));
    }
  }
});
