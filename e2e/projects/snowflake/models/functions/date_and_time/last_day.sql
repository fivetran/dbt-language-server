WITH sample_data AS (
  SELECT 1 AS id, DATE '2023-01-01' AS date
  UNION ALL
  SELECT 2, DATE '2023-02-01'
  UNION ALL
  SELECT 3, DATE '2023-03-01'
)
SELECT id, LAST_DAY(date) AS last_day
FROM sample_data;
