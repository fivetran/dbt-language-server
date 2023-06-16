WITH test_data AS (
    SELECT 1 AS id, 'a,b,c,d,e' AS csv, ARRAY[1, 2, 3, 4, 5] AS arr, OBJECT_INSERT(OBJECT_INSERT(NULL, 'k1', 'v1'), 'k2', 'v2') AS obj
    UNION ALL
    SELECT 2 AS id, 'f,g,h,i,j' AS csv, ARRAY[6, 7, 8, 9, 10] AS arr, OBJECT_INSERT(OBJECT_INSERT(NULL, 'k3', 'v3'), 'k4', 'v4') AS obj
)

SELECT 
    id, 
    TO_ARRAY(csv) AS array_from_csv,
    TO_ARRAY(arr) AS array_from_array,
    TO_ARRAY(obj) AS array_from_object
FROM test_data;
