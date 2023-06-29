WITH test_data AS (
  SELECT 
    ARRAY_CONSTRUCT(1, 2, 3) AS array1,
    ARRAY_CONSTRUCT(4, 5, 6) AS array2,
    ARRAY_CONSTRUCT(7, 8, 9) AS array3,
    NULL AS array4
)

SELECT
  array1,
  ARRAY_SIZE(array1) AS size_of_array1,
  array2,
  ARRAY_SIZE(array2) AS size_of_array2,
  array3,
  ARRAY_SIZE(array3) AS size_of_array3,
  array4,
  -- TODO:
  -- ARRAY_SIZE(array4) AS size_of_array4
FROM test_data;
