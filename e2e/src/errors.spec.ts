import { assertThat, endsWith, hasSize } from 'hamjest';
import { Diagnostic, languages, Position, Range } from 'vscode';
import { assertAllDiagnostics } from './asserts';
import {
  activateAndWait,
  closeActiveEditor,
  createAndOpenTempModel,
  deleteCurrentFile,
  getDocUri,
  getPreviewText,
  insertText,
  renameFile,
  setTestContent,
} from './helper';

suite('Errors', () => {
  const ERRORS_URI = getDocUri('errors.sql');
  const COMPLEX_QUERY_URI = getDocUri('complex_query.sql');
  const EPHEMERAL_URI = getDocUri('ephemeral.sql');

  const ERROR = 'Syntax error: SELECT list must not be empty';

  test('Should show error', async () => {
    // arrange
    await activateAndWait(ERRORS_URI);

    // assert
    await assertAllDiagnostics(ERRORS_URI, [new Diagnostic(new Range(0, 8, 0, 12), ERROR)]);
  });

  test('Should show no errors after fix query', async () => {
    // arrange
    await activateAndWait(ERRORS_URI);

    // act
    await insertText(new Position(0, 7), '*');

    // assert
    await assertAllDiagnostics(ERRORS_URI, []);
  });

  test('Should show no errors for query with different constructions', async () => {
    // act
    await activateAndWait(COMPLEX_QUERY_URI);

    // assert
    await assertAllDiagnostics(COMPLEX_QUERY_URI, []);
  });

  test(`Should show no errors for queries with materialized='ephemeral'`, async () => {
    // act
    await activateAndWait(EPHEMERAL_URI);

    // assert
    assertThat(getPreviewText(), endsWith('select * from dbt_ls_e2e_dataset.test_table1'));
    await assertAllDiagnostics(EPHEMERAL_URI, []);
  });

  test('Should clear diagnostic for deleted file', async () => {
    const uri = await createAndOpenTempModel('test-fixture');
    const query = '\nselect * from dbt_ls_e2e_dataset.test_table10';

    await setTestContent(`{{ config(materialized='view') }}${query}`);

    // Diagnostic should exist for query with error
    assertThat(languages.getDiagnostics(uri), hasSize(1));
    assertThat(getPreviewText(), query);

    await closeActiveEditor();
    const newUri = await renameFile(uri, 'temp_model_renamed.sql');
    await activateAndWait(newUri);

    // Diagnostic should exist for new file and shouldn't exist for old file
    assertThat(getPreviewText(), query);
    assertThat(languages.getDiagnostics(uri), hasSize(0));
    assertThat(languages.getDiagnostics(newUri), hasSize(1));

    await deleteCurrentFile();

    // Diagnostic shouldn't exist for deleted file
    assertThat(languages.getDiagnostics(newUri), hasSize(0));
  });
});
