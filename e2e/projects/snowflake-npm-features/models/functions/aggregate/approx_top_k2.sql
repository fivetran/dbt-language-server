WITH TestData AS (
    SELECT 'A' AS Category, 10 AS Value UNION ALL
    SELECT 'A' AS Category, 15 AS Value UNION ALL
    SELECT 'A' AS Category, 20 AS Value UNION ALL
    SELECT 'B' AS Category, 5 AS Value UNION ALL
    SELECT 'B' AS Category, 25 AS Value UNION ALL
    SELECT 'C' AS Category, 30 AS Value
),

ApproxTopKData AS (
    SELECT 
        Category,
        Value,
        APPROX_TOP_K(Value, 2) AS TopK_Values
    FROM TestData
    GROUP BY Category, Value
)

SELECT 
    Category,
    Value,
    TopK_Values,
    ROW_NUMBER() OVER(PARTITION BY Category ORDER BY TopK_Values DESC) AS RankWithinCategory
FROM ApproxTopKData
WHERE ARRAY_CONTAINS(Value, TopK_Values)
ORDER BY Category, RankWithinCategory;