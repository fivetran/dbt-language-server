WITH sales_data AS (
    SELECT 'Electronics' AS category, 2021 AS year, 1 AS quarter, 1000 AS sales
    UNION ALL
    SELECT 'Electronics', 2021, 2, 1200
    UNION ALL
    SELECT 'Electronics', 2021, 3, 1300
    UNION ALL
    SELECT 'Electronics', 2021, 4, 1400
    UNION ALL
    SELECT 'Electronics', 2022, 1, 1500
    UNION ALL
    SELECT 'Electronics', 2022, 2, 1600
    UNION ALL
    SELECT 'Clothing', 2021, 1, 2000
    UNION ALL
    SELECT 'Clothing', 2021, 2, 2100
    UNION ALL
    SELECT 'Clothing', 2021, 3, 2200
    UNION ALL
    SELECT 'Clothing', 2021, 4, 2300
    UNION ALL
    SELECT 'Clothing', 2022, 1, 2400
    UNION ALL
    SELECT 'Clothing', 2022, 2, 2500
)
-- Sales totals query using GROUP BY CUBE
SELECT category, year, quarter, SUM(sales) AS total_sales
FROM sales_data
GROUP BY CUBE (category, year, quarter)
ORDER BY category, year, quarter;
