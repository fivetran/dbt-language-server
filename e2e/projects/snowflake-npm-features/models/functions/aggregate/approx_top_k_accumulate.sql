WITH sample_data AS (
    SELECT 'A' AS col1, 1 AS col2 UNION ALL
    SELECT 'A' AS col1, 2 AS col2 UNION ALL
    SELECT 'B' AS col1, 3 AS col2 UNION ALL
    SELECT 'B' AS col1, 4 AS col2 UNION ALL
    SELECT 'C' AS col1, 5 AS col2 UNION ALL
    SELECT 'C' AS col1, 6 AS col2 UNION ALL
    SELECT 'D' AS col1, 7 AS col2 UNION ALL
    SELECT 'D' AS col1, 8 AS col2 UNION ALL
    SELECT 'E' AS col1, 9 AS col2 UNION ALL
    SELECT 'E' AS col1, 10 AS col2
)
SELECT 
    APPROX_TOP_K_ACCUMULATE(col2, 5) as top_k_accum
FROM 
    sample_data;
