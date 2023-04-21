WITH raw_data AS (
    SELECT 5 AS x, 100 AS total
    UNION ALL
    SELECT 20, 200
    UNION ALL
    SELECT 50, 500
)
SELECT x, total,
       x / (1.0 * total) AS probability,
       ROUND(100 * probability, 1) AS pct
FROM raw_data;
