{% call set_sql_header(config) %}
CREATE TEMP FUNCTION Foo(x INT64, y INT64, arr ARRAY<string>, s STRUCT<headers STRING, body STRING>) -- typo here, should be 'stRing'
RETURNS FLOAT64
AS (
  (cast(x as int64) + 4) / y
);
{%- endcall %}


SELECT
  val, Foo(val, 2, ['a'], STRUCT('h', 'b'))
FROM
  UNNEST([2,3,5,8]) AS val; 