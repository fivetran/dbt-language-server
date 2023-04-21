WITH sample_data AS (
  SELECT 10 AS value
  UNION ALL
  SELECT 20
  UNION ALL
  SELECT 30
  UNION ALL
  SELECT 40
)
SELECT value, WIDTH_BUCKET(value, 10, 40, 4) AS bucket
FROM sample_data;
