import { EOL } from 'node:os';
import { DiagnosticSeverity, Position, Range } from 'vscode';
import { assertAllDiagnostics, assertDiagnostics } from './asserts';
import { activateAndWait, appendText, createAndOpenTempModel, getDocUri, replaceText, setTestContent } from './helper';

suite('User defined function', () => {
  const DOC_URI = getDocUri('udf.sql');

  const FOO_NOT_FOUND = 'Function not found: Foo';
  const BAR_NOT_FOUND = 'Function not found: bar';
  const ARGS_DOES_NOT_MATCH =
    'Number of arguments does not match for function :FOO. Supported signature: FOO(STRING, INT64, ARRAY<STRING>, STRUCT<headers STRING, body STRING>)';

  test('Should compile sql with persistent UDF', async () => {
    await activateAndWait(DOC_URI);

    await assertDiagnostics(DOC_URI, []);

    await appendText(' + dbt_ls_e2e_dataset.my_custom_sum1(1, 2)');
    await assertDiagnostics(DOC_URI, [
      {
        severity: DiagnosticSeverity.Error,
        message: 'Function not found: dbt_ls_e2e_dataset.my_custom_sum1; Did you mean dbt_ls_e2e_dataset.my_custom_sum?',
        range: new Range(new Position(2, 68), new Position(2, 86)),
      },
    ]);
  });

  test('Should compile sql with temporary UDF', async () => {
    const uri = await createAndOpenTempModel('test-fixture', 'preview');

    await setTestContent(`{% call set_sql_header(config) %}
CREATE TEMP FUNCTION Foo(x sting, y INT64) -- typo here, should be 'stRing'
RETURNS FLOAT64
AS (
  (x + 4) / y
);
{%- endcall %}


SELECT
  val, Foo(val, 2)
FROM
  UNNEST([2,3,5,8]) AS val;`);

    await assertAllDiagnostics(
      uri,
      [
        {
          severity: DiagnosticSeverity.Error,
          message: FOO_NOT_FOUND,
          range: new Range(new Position(10, 7), new Position(10, 10)),
        },
      ],
      [
        {
          severity: DiagnosticSeverity.Error,
          message: FOO_NOT_FOUND,
          range: new Range(new Position(4, 7), new Position(4, 10)),
        },
      ],
    );

    await replaceText('x sting, y INT64', 'x string, y INT64, arr ARRAY<string>, s STRUCT<headers STRING, body STRING>', false);
    await replaceText('AS val;', 'AS val; --'); // To change preview content
    await assertAllDiagnostics(
      uri,
      [
        {
          severity: DiagnosticSeverity.Error,
          message: ARGS_DOES_NOT_MATCH,
          range: new Range(new Position(10, 7), new Position(10, 10)),
        },
      ],
      [
        {
          severity: DiagnosticSeverity.Error,
          message: ARGS_DOES_NOT_MATCH,
          range: new Range(new Position(4, 7), new Position(4, 10)),
        },
      ],
    );

    await replaceText('x string', 'x int64', false);
    await replaceText('val, 2', "val, 2, ['a'], STRUCT('h', 'b')");

    await assertAllDiagnostics(uri, []);

    await replaceText("'b'))", "'b')), bar()");
    await assertAllDiagnostics(
      uri,
      [
        {
          severity: DiagnosticSeverity.Error,
          message: BAR_NOT_FOUND,
          range: new Range(new Position(10, 45), new Position(10, 48)),
        },
      ],
      [
        {
          severity: DiagnosticSeverity.Error,
          message: BAR_NOT_FOUND,
          range: new Range(new Position(4, 45), new Position(4, 48)),
        },
      ],
    );

    await replaceText('{%- endcall %}', `CREATE TEMP FUNCTION bar() RETURNS FLOAT64 AS (1 + 1);${EOL}{%- endcall %}`, false);
    await replaceText(', bar()', ', bar() --'); // To change preview content

    await assertAllDiagnostics(uri, []);
  });
});
