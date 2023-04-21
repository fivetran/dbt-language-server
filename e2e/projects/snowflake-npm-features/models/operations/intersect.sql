WITH cte1 AS (
    SELECT 1 AS column_name
    UNION ALL
    SELECT 2 AS column_name
    UNION ALL
    SELECT 3 AS column_name
), cte2 AS (
    SELECT 2 AS column_name
    UNION ALL
    SELECT 3 AS column_name
    UNION ALL
    SELECT 4 AS column_name
)
SELECT column_name FROM cte1
INTERSECT
SELECT column_name FROM cte2;
