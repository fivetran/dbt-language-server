WITH sample_data AS (
  SELECT 1 AS id, 'Hello world' AS string, 7 AS start_pos, 5 AS length
  UNION ALL
  SELECT 2, 'Snowflakes for Snowflakes', 10, 5
  UNION ALL
  SELECT 3, 'If you read this, you have reached your success', 33, 4
)
SELECT id, SUBSTR(string, start_pos, length) AS substring
FROM sample_data;
