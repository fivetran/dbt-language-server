-- Using UNION to create a temporary data source
SELECT 
    degree, 
    RADIANS(degree::FLOAT) AS float_radians,
    RADIANS(degree::DOUBLE) AS double_radians,
    RADIANS(degree::NUMBER) AS number_radians
FROM 
    (
        SELECT 45 AS degree
        UNION ALL
        SELECT 90 AS degree
        UNION ALL
        SELECT 180 AS degree
    ) t;
