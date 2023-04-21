WITH sample_data AS (
  SELECT 1 AS id, 'Snowflakes' AS string, 3 AS repeat_count
  UNION ALL
  SELECT 2, 'OpenAI', 5
  UNION ALL
  SELECT 3, 'Data', 2
)
SELECT id, REPEAT(string, repeat_count) AS repeated_string
FROM sample_data;
