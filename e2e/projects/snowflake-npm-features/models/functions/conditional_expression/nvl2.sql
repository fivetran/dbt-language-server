WITH sample_data AS (
  SELECT 1 AS id, NULL AS score
  UNION ALL
  SELECT 2, 80
  UNION ALL
  SELECT 3, 90
  UNION ALL
  SELECT 4, NULL
  UNION ALL
  SELECT 5, 75
)

SELECT id,
       score,
       NVL2(score, 'Has Score', 'No Score') AS score_status
FROM sample_data;
