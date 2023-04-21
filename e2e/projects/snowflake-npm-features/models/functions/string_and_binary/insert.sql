WITH sample_data AS (
  SELECT 1 AS id, 'Hello world' AS original_string, 7 AS start_pos, 'beautiful ' AS insert_string
  UNION ALL
  SELECT 2, 'Snowflakes for Snowflakes', 10, 'of white '
  UNION ALL
  SELECT 3, 'If you read this, you have reached your success', 33, 'personal '
)
SELECT id, INSERT(original_string, start_pos, 0, insert_string) AS new_string
FROM sample_data;
