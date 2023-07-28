-- Using CTE (Common Table Expressions) to create a temporary data source
WITH test_data AS (
    SELECT 
        PI() AS number
    UNION ALL
    SELECT 
        PI()/2 AS number
    UNION ALL
    SELECT 
        PI()/3 AS number
)
-- Applying DEGREES function to all available data types
SELECT 
    number, 
    DEGREES(number::FLOAT) AS float_degrees,
    DEGREES(number::DOUBLE) AS double_degrees,
    DEGREES(number::NUMBER) AS number_degrees
FROM 
    test_data;
