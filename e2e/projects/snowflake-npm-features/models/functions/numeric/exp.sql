WITH sample_data AS (
  SELECT 1 AS id, 1 AS exponent
  UNION ALL
  SELECT 2, 2
  UNION ALL
  SELECT 3, 3
)
SELECT id, EXP(exponent) AS exp_value
FROM sample_data;
