-- Create sample data and define the recursive CTE
WITH RECURSIVE employees AS (
    -- Base data
    SELECT 1 AS employee_id, 'John' AS first_name, 'Doe' AS last_name, NULL AS manager_id
    UNION ALL
    SELECT 2, 'Jane', 'Smith', 1
    UNION ALL
    SELECT 3, 'Alice', 'Johnson', 1
    UNION ALL
    SELECT 4, 'Bob', 'Brown', 2
    UNION ALL
    SELECT 5, 'Charlie', 'Green', 2
    UNION ALL
    SELECT 6, 'David', 'White', 3
),
hierarchy AS (
    -- Anchor member: Select top-level employees (those without a manager)
    SELECT employee_id, first_name, last_name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL
    UNION ALL
    -- Recursive member: Select subordinates and increment level by 1
    SELECT e.employee_id, e.first_name, e.last_name, e.manager_id, h.level + 1
    FROM employees e
    JOIN hierarchy h ON e.manager_id = h.employee_id
)
-- Main query: Select the employee hierarchy
SELECT * FROM hierarchy
ORDER BY level, employee_id;
