import { assertThat, containsString } from 'hamjest';
import { ok } from 'node:assert';
import { CodeAction, commands, Diagnostic, DiagnosticSeverity, Range, workspace } from 'vscode';
import { assertDiagnostics } from './asserts';
import { activateAndWait, getDocUri, getMainEditorText, replaceText, waitDocumentModification } from './helper';

suite('SQL to ref', () => {
  const DOC_URI = getDocUri('ref_sql.sql');
  const DIAGNOSTIC_MESSAGE = 'Reference to dbt model is not a ref';
  const REF = "{{ ref('table_exists') }}";

  test('Should convert SQL to ref', async () => {
    await activateAndWait(DOC_URI);

    await replaceText(REF, '`singular-vector-135519`.`dbt_ls_e2e_dataset`.`table_exists` ');
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Information,
      range: new Range(1, 11, 1, 71),
      message: DIAGNOSTIC_MESSAGE,
    };
    await assertDiagnostics(DOC_URI, [diagnostic]);
    await waitDocumentModification(async () => {
      const [codeAction] = await commands.executeCommand<CodeAction[]>('vscode.executeCodeActionProvider', DOC_URI, new Range(1, 15, 1, 15));
      ok(codeAction.edit);
      await workspace.applyEdit(codeAction.edit);
      ok(codeAction.command?.arguments);
      await commands.executeCommand(codeAction.command.command, ...(codeAction.command.arguments as unknown[]));
    });

    await assertDiagnostics(DOC_URI, []);
    assertThat(getMainEditorText(), containsString(REF));
  });
});
