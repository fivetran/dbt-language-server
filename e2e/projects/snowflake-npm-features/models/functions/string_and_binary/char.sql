WITH sample_data AS (
  SELECT 1 AS id, 65 AS ascii_value
  UNION ALL
  SELECT 2, 66
  UNION ALL
  SELECT 3, 67
)
SELECT id, CHAR(ascii_value) AS character
FROM sample_data;
