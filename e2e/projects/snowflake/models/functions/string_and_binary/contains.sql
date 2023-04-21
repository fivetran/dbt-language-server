WITH sample_data AS (
  SELECT 1 AS id, 'Hello world' AS string, 'world' AS search_string
  UNION ALL
  SELECT 2, 'Snowflakes for Snowflakes', 'Flakes'
  UNION ALL
  SELECT 3, 'If you read this, you have reached your success', 'your success'
)
SELECT id, CONTAINS(string, search_string) AS contains
FROM sample_data;
