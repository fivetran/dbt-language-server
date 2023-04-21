WITH sample_data AS (
  SELECT 1 AS id, 'Hello world' AS string, 'world' AS search_string, 'beautiful universe' AS replacement
  UNION ALL
  SELECT 2, 'Snowflakes for Snowflakes', 'flakes', 'balls'
  UNION ALL
  SELECT 3, 'If you read this, you have reached your success', 'you', 'we'
)
SELECT id, REPLACE(string, search_string, replacement) AS replaced_string
FROM sample_data;
