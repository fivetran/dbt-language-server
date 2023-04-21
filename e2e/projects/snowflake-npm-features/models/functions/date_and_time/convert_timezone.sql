WITH sample_data AS (
  SELECT 1 AS id, '2023-01-01 00:00:00' AS datetime
  UNION ALL
  SELECT 2, '2023-02-01 00:00:00'
  UNION ALL
  SELECT 3, '2023-03-01 00:00:00'
)
SELECT id, CONVERT_TIMEZONE('UTC', 'America/New_York', datetime) AS new_datetime
FROM sample_data;
