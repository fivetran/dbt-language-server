WITH bit_values AS (
    SELECT 3 AS value
    UNION ALL
    SELECT 5
    UNION ALL
    SELECT 6
)
SELECT BITXOR_AGG(value) AS bitxor_result FROM bit_values;
