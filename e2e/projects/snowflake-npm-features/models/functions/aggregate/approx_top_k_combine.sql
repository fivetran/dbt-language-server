WITH source_data AS (
  SELECT 1 AS id, 'apple' AS fruit UNION ALL
  SELECT 2, 'banana' UNION ALL
  SELECT 3, 'cherry' UNION ALL
  SELECT 4, 'date' UNION ALL
  SELECT 5, 'elderberry' UNION ALL
  SELECT 6, 'fig' UNION ALL
  SELECT 7, 'grape' UNION ALL
  SELECT 8, 'honeydew' UNION ALL
  SELECT 9, 'imbe' UNION ALL
  SELECT 10, 'jackfruit'
),
approx_top_k AS (
  SELECT APPROX_TOP_K_ACCUMULATE(fruit, 3) AS top_3_fruits
  FROM source_data
),
combined_top_k AS (
  SELECT APPROX_TOP_K_COMBINE(top_3_fruits) AS combined_fruits
  FROM (
    SELECT top_3_fruits FROM approx_top_k
  ) AS subquery
)
SELECT combined_fruits
FROM combined_top_k;