WITH orders AS (
    SELECT 1 AS order_id, 101 AS customer_id FROM DUAL
    UNION ALL
    SELECT 2, 102 FROM DUAL
    UNION ALL
    SELECT 3, 101 FROM DUAL
),
customers AS (
    SELECT 101 AS customer_id, 'Jane Doe' AS customer_name FROM DUAL
    UNION ALL
    SELECT 102, 'John Smith' FROM DUAL
    UNION ALL
    SELECT 103, 'Alice Brown' FROM DUAL
)
SELECT o.order_id, o.customer_id, c.customer_name
FROM orders o, customers c
WHERE o.customer_id = c.customer_id(+)
ORDER BY o.order_id;