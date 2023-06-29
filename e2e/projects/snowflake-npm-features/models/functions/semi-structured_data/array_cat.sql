WITH test_data AS (
  SELECT 
    ARRAY_CONSTRUCT(1, 2, 3) AS array1,
    ARRAY_CONSTRUCT(4, 5, 6) AS array2,
    -- TODO:
    -- NULL AS array3,
    ARRAY_CONSTRUCT(NULL) AS array4,
    ARRAY_CONSTRUCT(7, 8, 9) AS array5
)

SELECT
  array1,
  array2,
  -- array3,
  array4,
  array5,
  ARRAY_CAT(array1, array2) AS cat_array_1_2, -- Combining two non-null arrays
  -- ARRAY_CAT(array1, array3) AS cat_array_1_3, -- Combining array and NULL
  ARRAY_CAT(array1, array4) AS cat_array_1_4, -- Combining array and array with NULL
  ARRAY_CAT(array1, array5) AS cat_array_1_5, -- Combining two non-null arrays
  -- ARRAY_CAT(array3, array4) AS cat_array_3_4, -- Combining NULL and array with NULL
  -- ARRAY_CAT(array3, array5) AS cat_array_3_5, -- Combining NULL and non-null array
  ARRAY_CAT(array4, array5) AS cat_array_4_5  -- Combining array with NULL and non-null array
FROM test_data;
