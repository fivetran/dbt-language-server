WITH test_data AS (
    SELECT NULL AS col1, 'Hello' AS col2, 100 AS col3
    UNION ALL
    SELECT 'World', NULL, 200
    UNION ALL
    SELECT NULL, NULL, NULL
)

SELECT 
    col1,
    col2,
    col3,
    NVL(col1, 'Default') AS nvl_col1_string,
    NVL(col2, 'Default') AS nvl_col2_string,
    NVL(col3, 0) AS nvl_col3_int,
    NVL(null, 1),
    NVL(1, 2),
    NVL(col3, 2),
    NVL(col3, col3)
FROM test_data;
