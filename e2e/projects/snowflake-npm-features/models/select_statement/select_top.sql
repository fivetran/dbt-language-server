WITH employees AS (
    SELECT 'Jane Doe' AS name, 100000 AS salary
    UNION ALL
    SELECT 'John Smith', 120000
    UNION ALL
    SELECT 'Alice Brown', 110000
    UNION ALL
    SELECT 'Bob Johnson', 90000
)
SELECT TOP 3 name, salary
FROM employees
ORDER BY salary DESC;
