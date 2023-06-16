WITH test_data AS (
  SELECT 
    ARRAY_CONSTRUCT(1, 2, 3) AS array1,
    ARRAY_CONSTRUCT(3, 4, 5) AS array2,
    ARRAY_CONSTRUCT(5, 6, 7) AS array3,
    NULL AS array4
)

SELECT
  array1,
  array2,
  ARRAY_INTERSECTION(array1, array2) AS intersection_1_2,
  array3,
  ARRAY_INTERSECTION(array1, array3) AS intersection_1_3,
  ARRAY_INTERSECTION(array2, array3) AS intersection_2_3,
  array4,
  -- TODO:
  -- ARRAY_INTERSECTION(array1, array4) AS intersection_1_4,
  -- ARRAY_INTERSECTION(array2, array4) AS intersection_2_4,
  -- ARRAY_INTERSECTION(array3, array4) AS intersection_3_4
FROM test_data;
