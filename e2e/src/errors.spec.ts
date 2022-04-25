import { assertThat, endsWith } from 'hamjest';
import { Diagnostic, Position, Range } from 'vscode';
import { assertDiagnostics } from './asserts';
import { activateAndWait, getDocUri, getPreviewText, insertText } from './helper';

suite('Errors', () => {
  const ERRORS_DOC_URI = getDocUri('errors.sql');
  const REFERRERS_DOC_URI = getDocUri('referrers.sql');
  const EPHEMERAL_DOC_URI = getDocUri('ephemeral.sql');

  const ERROR = 'Syntax error: SELECT list must not be empty';

  test('Should show error', async () => {
    // arrange
    await activateAndWait(ERRORS_DOC_URI);

    // assert
    await assertDiagnostics(ERRORS_DOC_URI, [new Diagnostic(new Range(0, 8, 0, 12), ERROR)]);
  });

  test('Should show no errors after fix query', async () => {
    // arrange
    await activateAndWait(ERRORS_DOC_URI);

    // act
    await insertText(new Position(0, 7), '*');

    // assert
    await assertDiagnostics(ERRORS_DOC_URI, []);
  });

  test(`Should show no errors for queries with recursive, nested structs, array of structs`, async () => {
    // act
    await activateAndWait(REFERRERS_DOC_URI);

    // assert
    await assertDiagnostics(REFERRERS_DOC_URI, []);
  });

  test(`Should show no errors for queries with materialized='ephemeral'`, async () => {
    // act
    await activateAndWait(EPHEMERAL_DOC_URI);

    // assert
    assertThat(getPreviewText(), endsWith('select * from dbt_ls_e2e_dataset.test_table1'));
    await assertDiagnostics(EPHEMERAL_DOC_URI, []);
  });
});
