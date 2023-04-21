WITH sample_data AS (
  SELECT 1 AS id, 5 AS value1, 2 AS value2
  UNION ALL
  SELECT 2, 7, 3
  UNION ALL
  SELECT 3, 10, 4
)
SELECT id, MOD(value1, value2) AS mod_value
FROM sample_data;
