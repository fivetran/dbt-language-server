-- Create sample tables and insert data
WITH employees AS (
    SELECT 1 AS employee_id, 'John' AS first_name, 'Doe' AS last_name
    UNION ALL
    SELECT 2, 'Jane', 'Smith'
    UNION ALL
    SELECT 3, 'Alice', 'Johnson'
),
departments AS (
    SELECT 1 AS department_id, 'HR' AS department_name
    UNION ALL
    SELECT 2, 'IT'
    UNION ALL
    SELECT 3, 'Finance'
),
-- Define a CTE for the literal join mapping
literal_join_mapping AS (
    SELECT 1 AS employee_id, 'HR' AS department_name
    UNION ALL
    SELECT 2, 'IT'
    UNION ALL
    SELECT 3, 'Finance'
)
-- Perform the literal join using the CTEs
SELECT e.employee_id, e.first_name, e.last_name, d.department_id, d.department_name
FROM employees e
JOIN literal_join_mapping m ON e.employee_id = m.employee_id
JOIN departments d ON m.department_name = d.department_name;
