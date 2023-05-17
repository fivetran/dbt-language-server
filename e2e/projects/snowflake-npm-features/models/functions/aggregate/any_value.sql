WITH sample_data AS (
    SELECT 'A' AS col1, 1 AS col2 UNION ALL
    SELECT 'A' AS col1, 2 AS col2 UNION ALL
    SELECT 'B' AS col1, 3 AS col2 UNION ALL
    SELECT 'B' AS col1, 4 AS col2
)
SELECT 
    col1, 
    ANY_VALUE(col2)
FROM 
    sample_data
GROUP BY 
    col1;
