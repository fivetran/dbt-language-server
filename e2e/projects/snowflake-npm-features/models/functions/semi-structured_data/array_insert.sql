WITH test_data AS (
  SELECT 1 AS id, ARRAY_CONSTRUCT(1, 2, 3) AS arr UNION ALL
  SELECT 2 AS id, ARRAY_CONSTRUCT(4, 5, 6, 7) AS arr UNION ALL
  SELECT 3 AS id, ARRAY_CONSTRUCT(8, 9) AS arr
)

SELECT 
  id, 
  arr AS original_array, 
  ARRAY_INSERT(arr, 1, 'a') AS insert_at_1,
  ARRAY_INSERT(arr, 0, 'b') AS insert_at_0,
  ARRAY_INSERT(arr, 3, 'c') AS insert_at_3,
  ARRAY_INSERT(arr, -1, 'd') AS insert_before_last,
  ARRAY_INSERT(arr, 10, 'e') AS insert_at_out_of_bounds
FROM test_data;
