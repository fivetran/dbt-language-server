WITH sample_data AS (
  SELECT 1 AS id, 27 AS value
  UNION ALL
  SELECT 2, 64
  UNION ALL
  SELECT 3, 125
)
SELECT id, CBRT(value) AS cbrt_value
FROM sample_data;
