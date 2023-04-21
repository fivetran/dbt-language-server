WITH sample_data AS (
  SELECT 1 AS id, 'Hello world' AS string, '%world%' AS pattern1, '%Hello%' AS pattern2
  UNION ALL
  SELECT 2, 'Snowflakes for Snowflakes', '%Flakes%', '%for%'
  UNION ALL
  SELECT 3, 'If you read this, you have reached your success', '%you%', '%reached%'
)
SELECT id, string LIKE pattern1 AND string LIKE pattern2 AS matches_all
FROM sample_data;
