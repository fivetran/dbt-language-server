WITH
cte1 AS (
    SELECT 'John' AS name, 25 AS age
    UNION
    SELECT 'Jane', 30
),
cte2 AS (
    SELECT 'Mary' AS name, 35 AS age
    UNION
    SELECT 'Mark', 40
)
SELECT name, age
FROM cte1
UNION
SELECT name, age
FROM cte2;
