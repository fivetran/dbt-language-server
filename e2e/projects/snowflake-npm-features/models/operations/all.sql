WITH cte AS (
    SELECT 5 AS value
    UNION ALL
    SELECT 7 AS value
    UNION ALL
    SELECT 10 AS value
)
SELECT *
FROM cte
WHERE value >= ALL (
    SELECT value
    FROM cte
);
