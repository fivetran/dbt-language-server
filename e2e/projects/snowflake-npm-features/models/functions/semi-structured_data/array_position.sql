WITH test_data AS (
  SELECT 
    ARRAY_CONSTRUCT(1, 2, 3) AS array1,
    ARRAY_CONSTRUCT(4, 5, 6) AS array2,
    ARRAY_CONSTRUCT(7, 8, 9) AS array3
)

SELECT
  array1,
  ARRAY_POSITION(1, array1) AS position_1_in_array1,
  ARRAY_POSITION(4, array1) AS position_4_in_array1,
  ARRAY_POSITION(NULL, array1) AS position_null_in_array1,
  array2,
  ARRAY_POSITION(1, array2) AS position_1_in_array2,
  ARRAY_POSITION(4, array2) AS position_4_in_array2,
  ARRAY_POSITION(NULL, array2) AS position_null_in_array2,
  array3,
  ARRAY_POSITION(1, array3) AS position_1_in_array3,
  ARRAY_POSITION(4, array3) AS position_4_in_array3,
  ARRAY_POSITION(NULL, array3) AS position_null_in_array3
FROM test_data;
