WITH test_data AS (
    SELECT
        PARSE_JSON('{ "a": 1, "b": 2, "c": 3 }') AS variant_data, 
        'Variant Object' AS test_case
    UNION ALL
    SELECT
        NULL AS variant_data, 
        'Null Input' AS test_case
    UNION ALL
    SELECT
        PARSE_JSON('null') AS variant_data, 
        'Json Null' AS test_case
    UNION ALL
    SELECT
        OBJECT_INSERT(OBJECT_INSERT(OBJECT_INSERT(NULL, 'a', 1), 'b', 2), 'c', 3) AS variant_data, 
        'Object' AS test_case
)
SELECT *
FROM test_data;
