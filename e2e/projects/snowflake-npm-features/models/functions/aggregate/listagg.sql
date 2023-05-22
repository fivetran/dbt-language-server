WITH sales_data AS (
    SELECT 'A' AS product, '2022-01-01' AS sale_date
    UNION ALL
    SELECT 'A', '2022-01-02'
    UNION ALL
    SELECT 'B', '2022-01-03'
    UNION ALL
    SELECT 'B', '2022-01-04'
    UNION ALL
    SELECT 'C', '2022-01-05'
)
SELECT product, LISTAGG(sale_date, ',') AS sale_dates, LISTAGG('asd', ',')
FROM sales_data
GROUP BY product;
