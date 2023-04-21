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
       CASE
           WHEN grade = 'A' THEN 'Excellent'
           WHEN grade = 'B' THEN 'Good'
           WHEN grade = 'C' THEN 'Average'
           ELSE 'Unknown'
       END AS performance
FROM sample_data;
