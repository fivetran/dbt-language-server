import { assertThat, hasSize, instanceOf, startsWith } from 'hamjest';
import { commands, Hover, MarkdownString, Position } from 'vscode';
import {
  activateAndWaitManifestParsed,
  executeSignatureHelpProvider,
  getCursorPosition,
  getDocUri,
  getMainEditorText,
  setTestContent,
  sleep,
  TEST_FIXTURE_PATH,
} from './helper';

suite('Functions', () => {
  const DOC_URI = getDocUri('functions.sql');

  test('Should show help for max function', async () => {
    // arrange
    await activateAndWaitManifestParsed(DOC_URI, TEST_FIXTURE_PATH);

    await setTestContent('select Max(', false);

    const help = await executeSignatureHelpProvider(DOC_URI, new Position(0, 11), '(');

    // assert
    assertThat(help.signatures.length, 1);
    assertThat(
      help.signatures[0].label,
      'MAX(\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]\n\n',
    );
    assertThat(help.signatures[0].documentation, instanceOf(MarkdownString));
    assertThat(
      (help.signatures[0].documentation as MarkdownString).value,
      'Returns the maximum value of non-`NULL` expressions. Returns `NULL` if there\nare zero input rows or `expression` evaluates to `NULL` for all rows.\nReturns `NaN` if the input contains a `NaN`.',
    );
  });

  test('Should move cursor into brackets after avg function completion', async () => {
    // arrange
    await activateAndWaitManifestParsed(DOC_URI, TEST_FIXTURE_PATH);

    await setTestContent('select Avg', false);

    // act
    await commands.executeCommand('editor.action.triggerSuggest');
    await sleep(400);
    await commands.executeCommand('acceptSelectedSuggestion');
    await sleep(300);

    // assert
    assertThat(getMainEditorText(), 'select avg()');
    assertThat(getCursorPosition(), new Position(0, 11));
  });

  test('Should show signature on hover', async () => {
    // arrange
    await activateAndWaitManifestParsed(DOC_URI, TEST_FIXTURE_PATH);

    await setTestContent('select Coalesce', false);

    // act
    const hovers = await commands.executeCommand<Hover[]>('vscode.executeHoverProvider', DOC_URI, new Position(0, 8));

    // assert
    assertThat(hovers, hasSize(1));
    assertThat(hovers[0].contents, hasSize(1));
    assertThat((hovers[0].contents[0] as MarkdownString).value, startsWith('```sql\nCOALESCE(expr[, ...])\n```'));
  });
});
