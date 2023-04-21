WITH sales_data AS (
    SELECT 1 AS product_id, 100.00 AS sale_price
    UNION ALL
    SELECT 2, 200.00
    UNION ALL
    SELECT 3, 300.00
    UNION ALL
    SELECT 4, 400.00
    UNION ALL
    SELECT 5, 500.00
    UNION ALL
    SELECT 6, 600.00
    UNION ALL
    SELECT 7, 700.00
    UNION ALL
    SELECT 8, 800.00
    UNION ALL
    SELECT 9, 900.00
    UNION ALL
    SELECT 10, 1000.00
)
-- Query using APPROX_PERCENTILE function
SELECT
    APPROX_PERCENTILE(sale_price, 0.5) AS median_price,
    APPROX_PERCENTILE(sale_price, 0.9) AS p90_price
FROM sales_data;
