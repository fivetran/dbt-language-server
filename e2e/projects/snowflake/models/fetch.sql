WITH employees AS (
    SELECT 1 AS id, 'Alice' AS name, 90000 AS salary
    UNION ALL
    SELECT 2, 'Bob', 80000
    UNION ALL
    SELECT 3, 'Charlie', 85000
    UNION ALL
    SELECT 4, 'David', 70000
    UNION ALL
    SELECT 5, 'Eva', 75000
)
-- Query using FETCH and CTE
SELECT id, name, salary
FROM employees
ORDER BY salary DESC
FETCH FIRST 3 ROWS ONLY;
