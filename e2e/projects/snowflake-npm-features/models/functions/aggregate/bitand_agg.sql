WITH bit_values AS (
    SELECT 3 AS value
    UNION ALL
    SELECT 5
    UNION ALL
    SELECT 6
)
SELECT BITAND_AGG(value) AS bitand_result FROM bit_values;
