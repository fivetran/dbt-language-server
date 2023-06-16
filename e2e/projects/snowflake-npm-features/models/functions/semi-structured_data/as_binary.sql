WITH test_data AS (
    SELECT 'Hello, world!' AS test_string
)

SELECT
    AS_BINARY(TO_VARIANT(test_string)),
    AS_BINARY(TO_VARIANT(TO_BINARY('F0A5')))
FROM
    test_data;
