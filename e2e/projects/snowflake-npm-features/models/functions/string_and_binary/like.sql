WITH sample_data AS (
  SELECT 1 AS id, 'Hello world' AS string, '%world%' AS pattern
  UNION ALL
  SELECT 2, 'Snowflakes for Snowflakes', '%Flakes%'
  UNION ALL
  SELECT 3, 'If you read this, you have reached your success', '%you%'
)
SELECT id, string LIKE pattern AS matches
FROM sample_data;
