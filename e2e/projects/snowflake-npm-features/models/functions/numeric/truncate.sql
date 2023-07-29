-- Using UNION to create a temporary data source
SELECT 
    number, 
    TRUNCATE(number::FLOAT, 2) AS float_truncate,
    TRUNCATE(number::DOUBLE, 2) AS double_truncate,
    TRUNCATE(number::NUMBER, 2) AS number_truncate,
    TRUNCATE(number::FLOAT) AS float_truncate,
    TRUNCATE(number::DOUBLE) AS double_truncate,
    TRUNCATE(number::NUMBER) AS number_truncate
FROM 
    (
        SELECT 5.1234 AS number
        UNION ALL
        SELECT 10.5678 AS number
        UNION ALL
        SELECT 15.9012 AS number
    ) t;
