WITH sample_data AS (
  SELECT 1 AS id, 'apple' AS fruit1, NULL AS fruit2
  UNION ALL
  SELECT 2, NULL, 'banana'
  UNION ALL
  SELECT 3, 'orange', NULL
  UNION ALL
  SELECT 4, 'apple', 'apple'
  UNION ALL
  SELECT 5, NULL, NULL
)

SELECT id,
       fruit1,
       fruit2,
       CASE
           WHEN fruit1 IS NOT DISTINCT FROM fruit2 THEN 'Equal'
           ELSE 'Not Equal'
       END AS equality
FROM sample_data;
