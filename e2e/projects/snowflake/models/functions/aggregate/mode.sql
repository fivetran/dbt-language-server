WITH sample_data AS (
    SELECT 1 AS value
    UNION ALL
    SELECT 1
    UNION ALL
    SELECT 2
    UNION ALL
    SELECT 2
    UNION ALL
    SELECT 2
    UNION ALL
    SELECT 3
    UNION ALL
    SELECT 4
    UNION ALL
    SELECT 5
    UNION ALL
    SELECT 5
    UNION ALL
    SELECT 6
)
SELECT MODE(value) AS mode_result FROM sample_data;
