WITH bool_values AS (
    SELECT TRUE AS value
    UNION ALL
    SELECT TRUE
    UNION ALL
    SELECT FALSE
)
SELECT BOOLOR_AGG(value) AS boolor_result FROM bool_values;
