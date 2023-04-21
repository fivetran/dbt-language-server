WITH sample_data AS (
  SELECT 1 AS id, 10 AS value
  UNION ALL
  SELECT 2, 20
  UNION ALL
  SELECT 3, 30
)
SELECT id, NORMAL(value) AS normal_value
FROM sample_data;
