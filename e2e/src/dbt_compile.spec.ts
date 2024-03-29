import { assertThat } from 'hamjest';
import { assertAllDiagnostics } from './asserts';
import {
  activateAndWait,
  createAndOpenTempModel,
  disableExtension,
  getDocUri,
  getPreviewText,
  installExtension,
  replaceText,
  setTestContent,
  sleep,
} from './helper';

suite('Should compile jinja expressions', () => {
  test('Should recompile when jinja expression changed', async () => {
    const selectFromTestTable1 = 'select * from dbt_ls_e2e_dataset.test_table1';
    const selectFromUsers = 'select * from dbt_ls_e2e_dataset.users';
    const docUri = getDocUri('dbt_compile.sql');

    await activateAndWait(docUri);

    await setTestContent(selectFromTestTable1);
    assertThat(getPreviewText(), selectFromTestTable1);

    // 'select * from dbt_ls_e2e_dataset.{{var("table_2")}}';
    await replaceText('test_table1', '{{var("table_2")}}');
    assertThat(getPreviewText(), selectFromUsers);

    // 'select * from dbt_ls_e2e_dataset.{{var("table_1")}}';
    await replaceText('_2', '_1');
    assertThat(getPreviewText(), selectFromTestTable1);

    // 'select * from dbt_ls_e2e_dataset.users';
    await replaceText('{{var("table_1")}}', 'users');
    assertThat(getPreviewText(), selectFromUsers);
  });

  test('Should compile every change if compilation not finished', async () => {
    const users = "{{ var('table_2') }}";
    const moreThanDebounceTimeout = 400;
    const docUri = getDocUri('sql_after_jinja.sql');

    await activateAndWait(docUri);
    await setTestContent(users);

    await replaceText('}}', '}}\n\n\ns');
    await sleep(moreThanDebounceTimeout);

    await replaceText('\ns', '\nselect 1;');

    assertThat(getPreviewText(), 'users\n\n\nselect 1;');
  });

  test('Compilation result for empty models should be empty', async () => {
    const uri = await createAndOpenTempModel('test-fixture', 'preview');

    await setTestContent("select u.id from {{ source('new_project', 'users') }} u");
    assertThat(getPreviewText(), 'select u.id from `singular-vector-135519`.`dbt_ls_e2e_dataset`.`users` u');
    await assertAllDiagnostics(uri, []);

    await setTestContent('');
    assertThat(getPreviewText(), ' ');
    await assertAllDiagnostics(uri, []);
  });

  // Sometimes 'samuelcolvin.jinjahtml' extension cannot be installed - server responded with 503.
  // It could take more time than default timeout. That is why timeout was extended for this test.
  test('Should compile files with jinja-sql languageId', async () => {
    // arrange
    installExtension('samuelcolvin.jinjahtml');

    const docUri = getDocUri('jinja_sql.sql');

    // act
    await activateAndWait(docUri);

    // assert
    assertThat(getPreviewText(), 'select * from `singular-vector-135519`.dbt_ls_e2e_dataset.test_table1');

    disableExtension('samuelcolvin.jinjahtml');
  }).timeout(300_000);
});
