WITH sales_data AS (
    SELECT 'A' AS product, '2022-01' AS month, 10 AS revenue
    UNION ALL
    SELECT 'A', '2022-02', 15
    UNION ALL
    SELECT 'B', '2022-01', 20
    UNION ALL
    SELECT 'B', '2022-02', 25
)
SELECT product, month, SUM(revenue) AS total_revenue, GROUPING_ID(product, month) AS grouping_id
FROM sales_data
GROUP BY GROUPING SETS ((product, month), (product), (month))
ORDER BY product, month;
