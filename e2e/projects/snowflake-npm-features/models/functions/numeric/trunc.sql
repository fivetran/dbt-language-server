-- Using UNION to create a temporary data source
SELECT 
    number, 
    TRUNC(number::FLOAT, 2) AS float_truncate,
    TRUNC(number::DOUBLE, 2) AS double_truncate,
    TRUNC(number::NUMBER, 2) AS number_truncate
FROM 
    (
        SELECT 5.1234 AS number
        UNION ALL
        SELECT 10.5678 AS number
        UNION ALL
        SELECT 15.9012 AS number
    ) t;
