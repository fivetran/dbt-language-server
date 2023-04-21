WITH sample_data AS (
  SELECT 1 AS id, 1 AS value
  UNION ALL
  SELECT 2, 2
  UNION ALL
  SELECT 3, 3
)
SELECT id, LN(value) AS ln_value
FROM sample_data;
