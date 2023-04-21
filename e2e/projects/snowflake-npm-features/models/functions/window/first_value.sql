WITH sample_data AS (
  SELECT 'John' AS first_name, 'Smith' AS last_name, 100 AS score
  UNION ALL
  SELECT 'Jane', 'Doe', 90
  UNION ALL
  SELECT 'Jim', 'Johnson', 80
)
SELECT first_name, last_name, score, FIRST_VALUE(score) OVER (ORDER BY score DESC) AS highest_score
FROM sample_data;
