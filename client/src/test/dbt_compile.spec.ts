import assert = require('assert');
import { activateAndWait, getDocUri, getPreviewText, replaceText, setTestContent, sleep, waitDbtCommand } from './helper';

suite('Should compile jinja expressions', () => {
  test('Should recompile jinja expression changed', async () => {
    const selectFromTestTable1 = 'select * from dbt_ls_e2e_dataset.test_table1';
    const selectFromUsers = 'select * from dbt_ls_e2e_dataset.users';
    const docUri = getDocUri('dbt_compile.sql');

    await activateAndWait(docUri);

    await setTestContent(selectFromTestTable1);
    await waitDbtCommand();
    assert.strictEqual(getPreviewText(), selectFromTestTable1);

    // 'select * from dbt_ls_e2e_dataset.{{var("table_2")}}';
    await replaceText('test_table1', '{{var("table_2")}}');
    await waitDbtCommand();
    assert.strictEqual(getPreviewText(), selectFromUsers);

    // 'select * from dbt_ls_e2e_dataset.{{var("table_1")}}';
    await replaceText('_2', '_1');
    await waitDbtCommand();
    assert.strictEqual(getPreviewText(), selectFromTestTable1);

    // 'select * from dbt_ls_e2e_dataset.users';
    await replaceText('{{var("table_1")}}', 'users');
    await waitDbtCommand();
    assert.strictEqual(getPreviewText(), selectFromUsers);
  });
});
