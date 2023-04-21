WITH sales_data AS (
    SELECT 1 AS customer_id
    UNION ALL
    SELECT 1
    UNION ALL
    SELECT 2
    UNION ALL
    SELECT 3
    UNION ALL
    SELECT 3
    UNION ALL
    SELECT 4
    UNION ALL
    SELECT 4
    UNION ALL
    SELECT 5
    UNION ALL
    SELECT 6
)
SELECT HLL(customer_id) AS hll_result FROM sales_data;
