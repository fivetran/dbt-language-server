WITH employees AS (
    SELECT 'Alice' AS name, 'HR' AS department, 90000 AS salary
    UNION ALL
    SELECT 'Bob', 'HR', 80000
    UNION ALL
    SELECT 'Charlie', 'HR', 85000
    UNION ALL
    SELECT 'David', 'Engineering', 120000
    UNION ALL
    SELECT 'Eva', 'Engineering', 110000
    UNION ALL
    SELECT 'Frank', 'Engineering', 115000
    UNION ALL
    SELECT 'Grace', 'Marketing', 70000
    UNION ALL
    SELECT 'Hannah', 'Marketing', 75000
    UNION ALL
    SELECT 'Ivy', 'Marketing', 73000
)
-- Query using QUALIFY
SELECT name, department, salary
FROM employees
QUALIFY ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) <= 3
ORDER BY department, salary DESC;