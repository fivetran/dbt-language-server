import { assertThat } from 'hamjest';
import { EOL } from 'node:os';
import { DiagnosticSeverity, Range } from 'vscode';
import { assertAllDiagnostics } from './asserts';
import { activateAndWait, getCustomDocUri, getMainEditorText, getPreviewText, replaceText, setTestContent } from './helper';
import path = require('node:path');

suite('Editing outside jinja without recompilation', () => {
  const DOC_URI = getCustomDocUri('completion-jinja/models/join_ref.sql');
  const DIAGNOSTICS = [
    {
      message: `Compilation Error in model join_ref (models${path.sep}join_ref.sql)${EOL}  unexpected '}', expected ')'${EOL}    line 6${EOL}      }}`,
      range: new Range(5, 0, 5, 100),
      severity: DiagnosticSeverity.Error,
    },
  ];

  test('Should not compile outside jinja if error exists', async () => {
    await activateAndWait(DOC_URI);
    const initialContent = getMainEditorText();
    const initialPreview = getPreviewText();
    assertThat(
      initialPreview,
      `

select u.id from \`singular-vector-135519\`.\`dbt_ls_e2e_dataset\`.\`users\` u
inner join \`singular-vector-135519\`.\`dbt_ls_e2e_dataset\`.\`test_table1\` t1 on u.name = t1.name`,
    );

    await replaceText('  )', '   ');
    assertThat(getPreviewText(), getMainEditorText());
    await assertAllDiagnostics(DOC_URI, DIAGNOSTICS);

    await replaceText('select u.id', 'select u.i');
    assertThat(getPreviewText(), getMainEditorText());
    await assertAllDiagnostics(DOC_URI, DIAGNOSTICS);

    await setTestContent(initialContent);
    assertThat(getPreviewText(), initialPreview);
    await assertAllDiagnostics(DOC_URI, []);
  });
});
