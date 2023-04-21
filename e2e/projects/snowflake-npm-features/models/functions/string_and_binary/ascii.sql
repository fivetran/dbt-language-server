WITH sample_data AS (
  SELECT 1 AS id, 'A' AS character
  UNION ALL
  SELECT 2, 'B'
  UNION ALL
  SELECT 3, 'C'
)
SELECT id, ASCII(character) AS ascii_value
FROM sample_data;
