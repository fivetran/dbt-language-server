WITH sample_data AS (
  SELECT 1 AS id, 'Snowflakes' AS string, 15 AS total_length, '-' AS pad_string
  UNION ALL
  SELECT 2, 'Snowflakes', 20, ' '
  UNION ALL
  SELECT 3, 'Snowflakes', 10, '+'
)
SELECT id, RPAD(string, total_length, pad_string) AS rpad_string
FROM sample_data;
