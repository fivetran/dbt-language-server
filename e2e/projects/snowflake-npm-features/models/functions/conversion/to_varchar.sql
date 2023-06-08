WITH TestData AS (
    SELECT 
        123 AS test_number,
        CURRENT_DATE AS test_date,
        CURRENT_TIME AS test_time,
        CURRENT_TIMESTAMP AS test_timestamp,
        TRUE AS test_boolean,
        PARSE_JSON('{"key": "value"}') AS test_variant,
        -- ARRAY_CONSTRUCT(1, 2, 3) AS test_array,
        -- OBJECT_INSERT(OBJECT_INSERT(NULL, 'key1', 'value1'), 'key2', 'value2') AS test_object
)

SELECT 
    TO_VARCHAR(test_number) AS varchar_number,
    TO_VARCHAR(test_date, 'YYYY-MM-DD') AS varchar_date,
    TO_VARCHAR(test_time, 'HH24:MI:SS') AS varchar_time,
    TO_VARCHAR(test_timestamp, 'YYYY-MM-DD HH24:MI:SS') AS varchar_timestamp,
    TO_VARCHAR(test_boolean) AS varchar_boolean,
    TO_VARCHAR(test_variant) AS varchar_variant,
    -- TO_VARCHAR(test_array) AS varchar_array,
    -- TO_VARCHAR(test_object) AS varchar_object
FROM TestData;
