WITH sample_data AS (
  SELECT 1 AS id, 'A' AS grade
  UNION ALL
  SELECT 2, 'B'
  UNION ALL
  SELECT 3, 'A'
  UNION ALL
  SELECT 4, 'C'
  UNION ALL
  SELECT 5, 'B'
)

SELECT id,
       grade,
       DECODE(grade, 'A', 'Excellent', 'B', 'Good', 'C', 'Average', 'Unknown') AS performance
FROM sample_data;
