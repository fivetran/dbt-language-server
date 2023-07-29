-- Using UNION to create a temporary data source
SELECT 
    number, 
    SQUARE(number::FLOAT) AS float_square,
    SQUARE(number::DOUBLE) AS double_square,
    SQUARE(number::NUMBER) AS number_square
FROM 
    (
        SELECT 5 AS number
        UNION ALL
        SELECT 10 AS number
        UNION ALL
        SELECT 15 AS number
    ) t;
