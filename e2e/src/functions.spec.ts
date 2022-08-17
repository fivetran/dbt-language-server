import { assertThat, hasSize, instanceOf, startsWith } from 'hamjest';
import * as vscode from 'vscode';
import { Hover } from 'vscode';
import { activateAndWaitManifestParsed, getCursorPosition, getDocUri, setTestContent, sleep, TEST_FIXTURE_PATH } from './helper';

suite('Functions', () => {
  const DOC_URI = getDocUri('functions.sql');

  test('Should show help for max function', async () => {
    // arrange
    await activateAndWaitManifestParsed(DOC_URI, TEST_FIXTURE_PATH);

    await setTestContent('select Max(', false);

    // act
    const help = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider',
      DOC_URI,
      new vscode.Position(0, 11),
      '(',
    );

    // assert
    assertThat(help.signatures.length, 1);
    assertThat(help.signatures[0].label, 'MAX(\n  expression\n  [HAVING {MAX | MIN} expression2]\n)\n[OVER (...)]\n');
    assertThat(help.signatures[0].documentation, instanceOf(vscode.MarkdownString));
    assertThat(
      (help.signatures[0].documentation as vscode.MarkdownString).value,
      'Returns the maximum value of non-`NULL` expressions. Returns `NULL` if there\nare zero input rows or `expression` evaluates to `NULL` for all rows.\nReturns `NaN` if the input contains a `NaN`.',
    );
  });

  test('Should move cursor into brackets after avg function completion', async () => {
    // arrange
    await activateAndWaitManifestParsed(DOC_URI, TEST_FIXTURE_PATH);

    await setTestContent('select Avg()', false);

    // act
    await vscode.commands.executeCommand('dbtWizard.afterFunctionCompletion');

    // assert
    await sleep(300);
    assertThat(getCursorPosition(), new vscode.Position(0, 11));
  });

  test('Should show signature on hover', async () => {
    // arrange
    await activateAndWaitManifestParsed(DOC_URI, TEST_FIXTURE_PATH);

    await setTestContent('select Coalesce', false);

    // act
    const hovers = await vscode.commands.executeCommand<Hover[]>('vscode.executeHoverProvider', DOC_URI, new vscode.Position(0, 8));

    // assert
    assertThat(hovers, hasSize(1));
    assertThat(hovers[0].contents, hasSize(1));
    assertThat((hovers[0].contents[0] as vscode.MarkdownString).value, startsWith(`\`\`\`sql\nCOALESCE(expr[, ...])\n\`\`\``));
  });
});
