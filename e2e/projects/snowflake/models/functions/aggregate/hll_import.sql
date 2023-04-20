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
),
hll_combined AS (
    SELECT HLL_COMBINE(HLL(customer_id)) AS hll_result
    FROM sales_data
),
hll_exported AS (
    SELECT HLL_EXPORT(hll_result) AS hll_exported
    FROM hll_combined
)
SELECT HLL_ESTIMATE(HLL_IMPORT(hll_exported)) AS unique_customers FROM hll_exported;
