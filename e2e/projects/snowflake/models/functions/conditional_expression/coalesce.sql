WITH sample_data AS (
  SELECT 1 AS id, NULL AS score_1, 80 AS score_2
  UNION ALL
  SELECT 2, 75, NULL
  UNION ALL
  SELECT 3, NULL, NULL
  UNION ALL
  SELECT 4, 85, 90
  UNION ALL
  SELECT 5, 70, 80
)

SELECT id,
       COALESCE(score_1, score_2, 0) AS best_score
FROM sample_data;
