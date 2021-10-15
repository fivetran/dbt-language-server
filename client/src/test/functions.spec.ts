import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateAndWait, getCursorPosition, getDocUri, setTestContent, sleep } from './helper';

suite('Functions', () => {
  const docUri = getDocUri('functions.sql');

  test('Should show help for max function', async () => {
    // arrange
    await activateAndWait(docUri);

    await setTestContent('select max(');

    // act
    const help = (await vscode.commands.executeCommand(
      'vscode.executeSignatureHelpProvider',
      docUri,
      new vscode.Position(0, 11),
      '(',
    )) as vscode.SignatureHelp;

    // assert
    assert.strictEqual(help.signatures.length, 1);
    assert.strictEqual(help.signatures[0].label, 'MAX(\n  expression\n  [HAVING {MAX | MIN} expression2]\n)\n[OVER (...)]\n');
    assert.strictEqual(
      (<vscode.MarkdownString>help.signatures[0].documentation).value,
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
    assert.deepStrictEqual(getCursorPosition(), new vscode.Position(0, 11));
  });
});
