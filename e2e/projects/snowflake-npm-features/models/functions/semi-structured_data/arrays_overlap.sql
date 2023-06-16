WITH test_data AS (
    SELECT 1 AS id, ARRAY_CONSTRUCT(1, 2, 3) AS array1, ARRAY_CONSTRUCT(3, 4, 5) AS array2
    UNION ALL
    SELECT 2 AS id, ARRAY_CONSTRUCT(6, 7, 8) AS array1, ARRAY_CONSTRUCT(9, 10, 11) AS array2
    UNION ALL
    SELECT 3 AS id, ARRAY_CONSTRUCT(12, 13, NULL) AS array1, ARRAY_CONSTRUCT(NULL, 14, 15) AS array2
)

SELECT id,
       array1,
       array2,
       ARRAYS_OVERLAP(array1, array2) AS arrays_overlap
FROM test_data;
