WITH bool_values AS (
SELECT TRUE AS value
UNION ALL
SELECT TRUE
UNION ALL
SELECT FALSE
)
SELECT BOOLAND_AGG(value) AS booland_result FROM bool_values;
