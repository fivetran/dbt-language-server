import * as assert from 'assert';
import {
  activateAndWait,
  getDocUri,
  getPreviewText,
  installExtension,
  replaceText,
  setTestContent,
  sleep,
  uninstallExtension,
  waitDbtCommand,
} from './helper';

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

  test('Should compile every change if compilation not finished', async () => {
    const users = `{{ var('table_2') }}`;
    const moreThanDebounceTimeout = 400;
    const docUri = getDocUri('sql_after_jinja.sql');

    await activateAndWait(docUri);
    await setTestContent(users);

    await replaceText('}}', '}}\n\n\ns');
    await sleep(moreThanDebounceTimeout);

    await replaceText('\ns', '\nselect 1;');
    await waitDbtCommand();

    assert.strictEqual(getPreviewText(), `users\n\n\nselect 1;`);
  });

  test('Should compile files with jinja-sql languageId', async () => {
    // arrange
    installExtension('samuelcolvin.jinjahtml');

    const docUri = getDocUri('jinja_sql.sql');

    // act
    await activateAndWait(docUri);
    await waitDbtCommand();

    // assert
    assert.strictEqual(getPreviewText(), 'select * from `singular-vector-135519`.dbt_ls_e2e_dataset.test_table1');

    uninstallExtension('samuelcolvin.jinjahtml');
  });
});
