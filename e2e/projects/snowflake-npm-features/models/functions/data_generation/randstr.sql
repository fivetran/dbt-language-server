WITH sample_data AS (
  SELECT 1 AS id, 10 AS value
  UNION ALL
  SELECT 2, 20
  UNION ALL
  SELECT 3, 30
)
SELECT id, RANDSTR(5, RANDOM()) AS random_string
FROM sample_data;
