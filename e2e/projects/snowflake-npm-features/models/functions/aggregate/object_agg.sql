WITH sample_data AS (
    SELECT 'A' AS key, 1 AS value
    UNION ALL
    SELECT 'B', 2
    UNION ALL
    SELECT 'C', 3
    UNION ALL
    SELECT 'D', 4
    UNION ALL
    SELECT 'E', 5
)
SELECT OBJECT_AGG(key, value) AS object_result FROM sample_data;
