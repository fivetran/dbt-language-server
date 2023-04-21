WITH sample_data AS (
  SELECT 1 AS id, 'Hello WORLD' AS string
  UNION ALL
  SELECT 2, 'SnowFlakes for SNOWFLAKES'
  UNION ALL
  SELECT 3, 'If You Read This, You Have Reached Your SUCCESS'
)
SELECT id, LOWER(string) AS lower_case
FROM sample_data;
