WITH employees AS (
    SELECT 'Jane Doe' AS name, 'Engineering' AS department
    UNION ALL
    SELECT 'John Smith', 'Sales'
    UNION ALL
    SELECT 'Alice Brown', 'Engineering'
    UNION ALL
    SELECT 'Bob Johnson', 'Marketing'
    UNION ALL
    SELECT 'Charlie Green', 'Sales'
    UNION ALL
    SELECT 'David Blue', 'Engineering'
    UNION ALL
    SELECT 'Eve White', 'Marketing'
)
SELECT name, department
FROM employees
SAMPLE (50);
