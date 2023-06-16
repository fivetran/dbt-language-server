WITH test_data AS (
    SELECT 1 AS id, ARRAY_CONSTRUCT(1, 2, 3, 4, 5) AS arr
    UNION ALL
    SELECT 2 AS id, ARRAY_CONSTRUCT(6, 7, 8, 9, 10) AS arr
    UNION ALL
    SELECT 3 AS id, ARRAY_CONSTRUCT(11, 12, 13, 14, 15) AS arr
)
SELECT 
    id,
    arr AS original_array,
    ARRAY_SLICE(arr, 1, 3) AS sliced_array,
    ARRAY_SLICE(arr, -4, -2) AS sliced_array_with_negative_indices,
    ARRAY_SLICE(arr, 6, 8) AS sliced_array_beyond_upper_end,
    ARRAY_SLICE(arr, -6, -8) AS sliced_array_beyond_lower_end,
    ARRAY_SLICE(arr, NULL, 3) AS sliced_array_with_null_from,
    ARRAY_SLICE(arr, 1, NULL) AS sliced_array_with_null_to
FROM test_data;
