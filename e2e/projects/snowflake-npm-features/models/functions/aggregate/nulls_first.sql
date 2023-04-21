WITH employees AS (
    SELECT 1 AS id, 'Alice' AS name, 90000 AS salary
    UNION ALL
    SELECT 2, 'Bob', 80000
    UNION ALL
    SELECT 3, 'Charlie', NULL
    UNION ALL
    SELECT 4, 'David', 70000
    UNION ALL
    SELECT 5, 'Eva', NULL
)
-- Query using NULLS FIRST
SELECT id, name, salary
FROM employees
ORDER BY salary NULLS FIRST;
