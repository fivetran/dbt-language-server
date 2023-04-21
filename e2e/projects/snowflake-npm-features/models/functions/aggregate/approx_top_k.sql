WITH product_data AS (
    SELECT 'Red' AS color
    UNION ALL
    SELECT 'Red'
    UNION ALL
    SELECT 'Green'
    UNION ALL
    SELECT 'Blue'
    UNION ALL
    SELECT 'Blue'
    UNION ALL
    SELECT 'Yellow'
    UNION ALL
    SELECT 'Red'
    UNION ALL
    SELECT 'Blue'
    UNION ALL
    SELECT 'Green'
    UNION ALL
    SELECT 'Yellow'
)
-- Query using APPROX_TOP_K function
SELECT color, frequency
FROM APPROX_TOP_K(color, 3) OVER ()
FROM product_data;
