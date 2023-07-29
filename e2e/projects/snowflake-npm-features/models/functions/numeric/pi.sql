-- Using CTE (Common Table Expressions) to create a temporary data source
WITH test_data AS (
    SELECT 
        1 AS dummy_column
    UNION ALL
    SELECT 
        2 AS dummy_column
    UNION ALL
    SELECT 
        3 AS dummy_column
)
-- Applying PI function to all available data types
SELECT 
    dummy_column, 
    PI()::FLOAT AS float_pi,
    PI()::DOUBLE AS double_pi,
    PI()::NUMBER AS number_pi
FROM 
    test_data;
