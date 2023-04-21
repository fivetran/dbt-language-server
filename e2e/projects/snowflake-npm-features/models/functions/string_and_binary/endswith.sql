WITH sample_data AS (
  SELECT 1 AS id, 'Hello world' AS string, 'world' AS suffix
  UNION ALL
  SELECT 2, 'Snowflakes for Snowflakes', 'flakes'
  UNION ALL
  SELECT 3, 'If you read this, you have reached your success', 'success'
)
SELECT id, ENDSWITH(string, suffix) AS ends_with
FROM sample_data;
