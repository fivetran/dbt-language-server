import { assertThat, endsWith } from 'hamjest';
import { Diagnostic, Position, Range } from 'vscode';
import { assertAllDiagnostics } from './asserts';
import { activateAndWait, getDocUri, getPreviewText, insertText } from './helper';

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
});
