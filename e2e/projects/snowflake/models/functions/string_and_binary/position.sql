WITH sample_data AS (
  SELECT 1 AS id, 'Hello world' AS string, 'world' AS search_string
  UNION ALL
  SELECT 2, 'Snowflakes for Snowflakes', 'flakes'
  UNION ALL
  SELECT 3, 'If you read this, you have reached your success', 'you'
)
SELECT id, CASE WHEN POSITION(search_string, string) > 0 THEN POSITION(search_string, string) ELSE NULL END AS position
FROM sample_data;
