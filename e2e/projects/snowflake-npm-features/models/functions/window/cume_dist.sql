WITH sample_data AS (
  SELECT 'John' AS first_name, 'Smith' AS last_name, 100 AS score
  UNION ALL
  SELECT 'Jane', 'Doe', 90
  UNION ALL
  SELECT 'Jim', 'Johnson', 80
  UNION ALL
  SELECT 'Jack', 'Williams', 70
)
SELECT first_name, last_name, score, CUME_DIST() OVER (ORDER BY score DESC) AS percentile
FROM sample_data;
