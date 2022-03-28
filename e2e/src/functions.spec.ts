import { assertThat, instanceOf } from 'hamjest';
import * as vscode from 'vscode';
import { activateAndWait, getCursorPosition, getDocUri, setTestContent, sleep } from './helper';

suite('Functions', () => {
  const docUri = getDocUri('functions.sql');

  test('Should show help for max function', async () => {
    // arrange
    await activateAndWait(docUri);

    await setTestContent('select max(');

    // act
    const help = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      'vscode.executeSignatureHelpProvider',
      docUri,
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
    await activateAndWait(docUri);

    await setTestContent('select avg()');

    // act
    await vscode.commands.executeCommand('editor.afterFunctionCompletion');

    // assert
    await sleep(300);
    assertThat(getCursorPosition(), new vscode.Position(0, 11));
  });
});
