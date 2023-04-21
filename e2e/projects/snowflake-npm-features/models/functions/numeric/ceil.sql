WITH sample_data AS (
  SELECT 1 AS id, 1.5 AS value
  UNION ALL
  SELECT 2, 2.7
  UNION ALL
  SELECT 3, -3.2
)
SELECT id, CEIL(value) AS ceil_value
FROM sample_data;
