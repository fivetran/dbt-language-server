WITH test_data AS (
    SELECT 'John' as name, 35 as age, 'USA' as country
    UNION ALL
    SELECT 'Jane', 30, 'UK'
    UNION ALL
    SELECT 'Jack', 28, 'Australia'
)

SELECT
    -- First, create an object with constant keys and values from the table.
    OBJECT_CONSTRUCT('Name', name, 'Age', age, 'Country', country) as obj1,
    
    -- Next, create an object with some keys being constant and some values being expressions.
    OBJECT_CONSTRUCT('Name', name, 'Age', age, 'IsAdult', age >= 18) as obj2,
    
    -- Create an object with a key that is the result of a function.
    OBJECT_CONSTRUCT(UPPER('Name'), name) as obj3,
    
    -- Create an object with a key-value pair where the key is a conastant and the value is a subquery.
    OBJECT_CONSTRUCT('Name', (SELECT name FROM test_data WHERE age = (SELECT MIN(age) FROM test_data))) as obj4
    
FROM test_data;
