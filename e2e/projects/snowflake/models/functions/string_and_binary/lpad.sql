WITH sample_data AS (
  SELECT 1 AS id, 'Snowflakes' AS string, 15 AS total_length, '-' AS pad_string
  UNION ALL
  SELECT 2, 'Snowflakes', 20, ' '
  UNION ALL
  SELECT 3, 'Snowflakes', 10, '+'
)
SELECT id, LPAD(string, total_length, pad_string) AS lpad_string
FROM sample_data;
