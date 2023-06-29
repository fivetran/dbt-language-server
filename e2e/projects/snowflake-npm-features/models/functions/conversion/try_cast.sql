WITH test_data AS (
    SELECT '123' AS valid_number, 'ABC' AS invalid_number
)
SELECT
    TRY_CAsT(valid_number AS INTEGER) AS cast_valid_number,
    TRY_CAST(invalid_number AS INTEGER) AS cast_invalid_number
FROM
    test_data;
