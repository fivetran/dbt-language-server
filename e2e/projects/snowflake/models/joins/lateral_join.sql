WITH
  employees AS (
    SELECT 1 AS id, 'Alice' AS name, 10 AS department_id UNION ALL
    SELECT 2, 'Bob', 20 UNION ALL
    SELECT 3, 'Carol', 20 UNION ALL
    SELECT 4, 'Dave', 30
  ),
  departments AS (
    SELECT 10 AS id, 'HR' AS name UNION ALL
    SELECT 20, 'IT' UNION ALL
    SELECT 30, 'Finance'
  )
SELECT
  e.id,
  e.name,
  e.department_id,
  d.id AS department_id,
  d.name AS department_name
FROM
  employees e,
  LATERAL (
    SELECT
      id,
      name
    FROM
      departments
  ) d;
