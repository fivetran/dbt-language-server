WITH test_data AS (
  SELECT 
    ARRAY_CONSTRUCT(1, 2, 3) AS array1,
    ARRAY_CONSTRUCT(4, 5, 6) AS array2,
    ARRAY_CONSTRUCT(7, 8, 9) AS array3,
    NULL AS array4
)

SELECT
  array1,
  ARRAY_PREPEND(array1, 'a') AS prepend_a_to_array1,
  ARRAY_PREPEND(array2, 'b') AS prepend_b_to_array2,
  ARRAY_PREPEND(array3, 'c') AS prepend_c_to_array3,
  -- TODO:
  -- ARRAY_PREPEND(array4, 'd') AS prepend_d_to_array4
FROM test_data;
