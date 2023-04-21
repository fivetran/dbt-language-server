WITH sample_data AS (
  SELECT 1 AS id, 10 AS value
  UNION ALL
  SELECT 2, 20
  UNION ALL
  SELECT 3, 30
)
SELECT id, UNIFORM(1, 10, RANDOM()) AS uniform_value
FROM sample_data;
