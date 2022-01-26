import { assertThat } from 'hamjest';
import { Diagnostic, languages, Position, Range, Uri } from 'vscode';
import { activateAndWait, getDocUri, insertText, PREVIEW_URI, sleep } from './helper';

suite('Errors', () => {
  const DOC_URI = getDocUri('errors.sql');
  const ERROR = 'Syntax error: SELECT list must not be empty';

  test('Should show error', async () => {
    // arrange
    await activateAndWait(DOC_URI);

    // assert
    await testDiagnostics(DOC_URI, [new Diagnostic(new Range(0, 8, 0, 12), ERROR)]);
  });

  test('Should show no errors after fix query', async () => {
    // arrange
    await activateAndWait(DOC_URI);

    // act
    await insertText(new Position(0, 7), '*');

    // assert
    await testDiagnostics(DOC_URI, []);
  });

  async function testDiagnostics(uri: Uri, diagnostics: Diagnostic[]): Promise<void> {
    await sleep(100);

    const rawDocDiagnostics = languages.getDiagnostics(uri);
    const previewDiagnostics = languages.getDiagnostics(Uri.parse(PREVIEW_URI));

    assertThat(rawDocDiagnostics.length, diagnostics.length);
    assertThat(previewDiagnostics.length, diagnostics.length);

    if (diagnostics.length === 1) {
      assertThat(rawDocDiagnostics[0].message, diagnostics[0].message);
      assertRange(rawDocDiagnostics[0].range, diagnostics[0].range);

      assertThat(previewDiagnostics[0].message, diagnostics[0].message);
      assertRange(previewDiagnostics[0].range, diagnostics[0].range);
    }
  }

  function assertRange(actualRange: Range, expectedRange: Range): void {
    assertThat(actualRange.start.line, expectedRange.start.line);
    assertThat(actualRange.start.character, expectedRange.start.character);
    assertThat(actualRange.end.line, expectedRange.end.line);
    assertThat(actualRange.end.character, expectedRange.end.character);
  }
});
