import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activateAndWait, setTestContent, sleep, getCursorPositioin } from './helper';

suite('Functions', async () => {
  const docUri = getDocUri('functions.sql');

  test('Should show help for max function', async () => {
    await activateAndWait(docUri);

    await setTestContent('select max(');

    const help = (await vscode.commands.executeCommand(
      'vscode.executeSignatureHelpProvider',
      docUri,
      new vscode.Position(0, 11),
      '(',
    )) as vscode.SignatureHelp;

    assert.strictEqual(help.signatures.length, 1);
    assert.strictEqual(help.signatures[0].label, 'MAX(\n  expression\n  [HAVING {MAX | MIN} expression2]\n)\n[OVER (...)]\n');
    assert.strictEqual(
      (<vscode.MarkdownString>help.signatures[0].documentation).value,
      'Returns the maximum value of non-`NULL` expressions. Returns `NULL` if there\nare zero input rows or `expression` evaluates to `NULL` for all rows.\nReturns `NaN` if the input contains a `NaN`.',
    );
  });

  test('Should move cursor into brackets after avg function completion', async () => {
    await activateAndWait(docUri);

    await setTestContent('select avg()');
    await vscode.commands.executeCommand('editor.afterFunctionCompletion');

    await sleep(300);
    const t = (await vscode.commands.executeCommand('vscode.executeCodeLensProvider', docUri)) as vscode.SignatureHelp;

    assert.deepStrictEqual(getCursorPositioin(), new vscode.Position(0, 11));
  });
});
