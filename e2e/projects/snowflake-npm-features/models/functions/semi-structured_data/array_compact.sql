WITH test_data AS (
  SELECT 
    ARRAY_CONSTRUCT(1, 2, NULL, 4, 5, NULL, 6) AS array1,
    ARRAY_CONSTRUCT(NULL, NULL, NULL) AS array2,
    ARRAY_CONSTRUCT(7, 8, NULL, 9, NULL) AS array3,
    NULL AS array4
)

SELECT
  array1,
  ARRAY_COMPACT(array1) AS compact_array1,
  array2,
  ARRAY_COMPACT(array2) AS compact_array2,
  array3,
  ARRAY_COMPACT(array3) AS compact_array3,
  array4,
  -- TODO:
  -- ARRAY_COMPACT(array4) AS compact_array4
FROM test_data;
