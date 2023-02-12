{% call set_sql_header(config) %}
CREATE TEMP FUNCTION ScalarUdf(a ANY TYPE)
AS (
  a + 1
);
{%- endcall %}
select ScalarUdf(1);
