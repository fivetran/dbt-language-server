WITH TestData AS (
    SELECT 'A' AS Col1, 'X' AS Col2, 10 AS Col3, TRUE AS IsTrue UNION ALL
    SELECT 'A', 'Y', 20, FALSE UNION ALL
    SELECT 'A', 'Y', 30, TRUE UNION ALL
    SELECT 'B', 'X', 40, FALSE UNION ALL
    SELECT 'B', 'Z', 50, TRUE UNION ALL
    SELECT 'B', 'Z', 60, FALSE
)

SELECT 
    Col1, 
    Col2, 
    Col3,
    IsTrue,
    GROUPING_ID(Col1) AS GroupingID_Col1,
    GROUPING_ID(Col2) AS GroupingID_Col2,
    GROUPING_ID(Col3) AS GroupingID_Col3,
    GROUPING_ID(IsTrue) AS GroupingID_IsTrue,
    GROUPING_ID(Col1, Col2) AS GroupingID_Col1_Col2,
    GROUPING_ID(Col1, Col2, Col3, IsTrue) AS GroupingID_Col1_Col2_Col3_IsTrue
FROM 
    TestData
GROUP BY 
    ROLLUP (Col1, Col2, Col3, IsTrue);
