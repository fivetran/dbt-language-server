WITH test_data AS (
  SELECT 
    ARRAY_CONSTRUCT(1, 2, 3) AS array1,
    ARRAY_CONSTRUCT(4, 5, 6) AS array2,
    NULL AS array3,
    ARRAY_CONSTRUCT(NULL) AS array4,
    ARRAY_CONSTRUCT(7, 8, 9) AS array5
)

SELECT
  array1,
  ARRAY_CONTAINS(1, array1) AS contains_1_in_array1,
  ARRAY_CONTAINS(4, array1) AS contains_4_in_array1,
  ARRAY_CONTAINS(NULL, array1) AS contains_null_in_array1,
  ARRAY_CONTAINS(1, array2) AS contains_1_in_array2,
  ARRAY_CONTAINS(4, array2) AS contains_4_in_array2,
  ARRAY_CONTAINS(NULL, array2) AS contains_null_in_array2,
  -- ARRAY_CONTAINS(1, array3) AS contains_1_in_array3,
  -- ARRAY_CONTAINS(4, array3) AS contains_4_in_array3,
  -- ARRAY_CONTAINS(NULL, array3) AS contains_null_in_array3,
  ARRAY_CONTAINS(1, array4) AS contains_1_in_array4,
  ARRAY_CONTAINS(4, array4) AS contains_4_in_array4,
  ARRAY_CONTAINS(NULL, array4) AS contains_null_in_array4,
  ARRAY_CONTAINS(1, array5) AS contains_1_in_array5,
  ARRAY_CONTAINS(4, array5) AS contains_4_in_array5,
  ARRAY_CONTAINS(NULL, array5) AS contains_null_in_array5
FROM test_data;
