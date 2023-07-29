-- Using VALUES to create a temporary data source
SELECT 
    number, 
    FACTORIAL(number::FLOAT) AS float_factorial,
    FACTORIAL(number::DOUBLE) AS double_factorial,
    FACTORIAL(number::NUMBER) AS number_factorial
FROM 
    (select 5 as number
    union select 10.1
    union select 15);
