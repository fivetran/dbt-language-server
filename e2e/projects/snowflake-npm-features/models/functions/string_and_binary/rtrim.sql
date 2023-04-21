WITH sample_data AS (
  SELECT 1 AS id, 'Snowflakes   ' AS string
  UNION ALL
  SELECT 2, '  Snowflakes  '
  UNION ALL
  SELECT 3, '      Snowflakes      '
)
SELECT id, RTRIM(string) AS rtrim_string
FROM sample_data;
