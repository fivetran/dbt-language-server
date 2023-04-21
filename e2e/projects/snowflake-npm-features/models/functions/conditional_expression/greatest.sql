WITH sample_data AS (
  SELECT 1 AS id, 10 AS value1, 5 AS value2, 8 AS value3
  UNION ALL
  SELECT 2, 15, 20, 7
  UNION ALL
  SELECT 3, 12, 18, 22
  UNION ALL
  SELECT 4, 8, 14, 6
  UNION ALL
  SELECT 5, 30, 25, 28
)

SELECT id,
       value1,
       value2,
       value3,
       GREATEST(value1, value2, value3) AS max_value
FROM sample_data;
