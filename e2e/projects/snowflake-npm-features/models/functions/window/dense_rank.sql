WITH sample_data AS (
  SELECT 'John' AS first_name, 'Smith' AS last_name, 100 AS score
  UNION ALL
  SELECT 'Jane', 'Doe', 90
  UNION ALL
  SELECT 'Jim', 'Johnson', 100
  UNION ALL
  SELECT 'Jack', 'Williams', 80
)
SELECT first_name, last_name, score, DENSE_RANK() OVER (ORDER BY score DESC) AS rank
FROM sample_data;
