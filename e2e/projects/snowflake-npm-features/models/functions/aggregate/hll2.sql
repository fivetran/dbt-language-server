WITH source_data AS (
    SELECT 'argument1' AS arg1, 2 AS arg2
    UNION ALL
    SELECT 'argument3' AS arg1, 4 AS arg2
    UNION ALL
    SELECT 'argument1' AS arg1, 2 AS arg2
)
SELECT HLL(arg1, arg2)
FROM source_data
