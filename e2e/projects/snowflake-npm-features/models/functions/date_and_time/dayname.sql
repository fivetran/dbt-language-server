WITH sample_data AS (
  SELECT 1 AS id, '2023-01-01' AS date
  UNION ALL
  SELECT 2, '2023-02-01'
  UNION ALL
  SELECT 3, '2023-03-01'
)
SELECT id, DAYNAME(date) AS day_name
FROM sample_data;
