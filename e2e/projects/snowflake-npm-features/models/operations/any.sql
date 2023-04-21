WITH cte AS (
    SELECT 5 AS value
    UNION ALL
    SELECT 7 AS value
    UNION ALL
    SELECT 10 AS value
)
SELECT *
FROM cte
WHERE value > ANY (
    SELECT value
    FROM cte
    WHERE value < 10
);
