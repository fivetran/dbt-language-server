WITH sample_data AS (
  SELECT 'John' AS first_name, 'Smith' AS last_name, 100 AS score
  UNION ALL
  SELECT 'Jane', 'Doe', 90
  UNION ALL
  SELECT 'Jim', 'Johnson', 80
)
SELECT first_name, last_name, score, ROW_NUMBER() OVER (ORDER BY score DESC) AS row_num
FROM sample_data;
