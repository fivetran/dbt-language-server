WITH orders AS (
    SELECT 1 AS order_id, 101 AS customer_id, '2023-01-01' AS order_date
    UNION ALL
    SELECT 2, 102, '2023-01-02'
    UNION ALL
    SELECT 3, 101, '2023-01-03'
),
customers AS (
    SELECT 101 AS customer_id, 'Jane Doe' AS customer_name
    UNION ALL
    SELECT 102, 'John Smith'
    UNION ALL
    SELECT 103, 'Alice Brown'
)
SELECT *
FROM orders
NATURAL JOIN customers
ORDER BY order_id;
