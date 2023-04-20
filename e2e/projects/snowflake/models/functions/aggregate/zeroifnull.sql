WITH orders AS (
    SELECT 1 AS customer_id, 1001 AS order_id, 150.00 AS total_amount
    UNION ALL
    SELECT 2, 1002, NULL
    UNION ALL
    SELECT 3, 1003, 120.00
)
SELECT customer_id, order_id, ZEROIFNULL(total_amount) AS total_amount
FROM orders;
