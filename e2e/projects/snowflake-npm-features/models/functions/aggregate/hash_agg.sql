WITH sales_data AS (
    SELECT 'A' AS product, 10 AS revenue
    UNION ALL
    SELECT 'B', 15
    UNION ALL
    SELECT 'A', 20
    UNION ALL
    SELECT 'B', 25
)
SELECT product, HASH_AGG(revenue) AS hash_agg_result
FROM sales_data
GROUP BY product;
