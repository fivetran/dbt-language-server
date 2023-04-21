WITH bit_values AS (
    SELECT 3 AS value
    UNION ALL
    SELECT 5
    UNION ALL
    SELECT 6
)
SELECT BITOR_AGG(value) AS bitor_result FROM bit_values;
