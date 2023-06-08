WITH test_data AS (
    SELECT 
        PARSE_JSON('{"Name":"John", "Age":35, "Country":"USA"}') as person,
        -- ARRAY_INSERT(ARRAY_INSERT(TO_ARRAY(''), 0, 'John'), 1, 35) as array,
        100 as number
)

SELECT
    -- Check if 'person' is an object
    IS_OBJECT(person) as obj1,
        
    -- TODO:
    -- Check if 'array' is an object
    -- IS_OBJECT(array) as obj3,
    
    -- Check if 'number' is an object
    IS_OBJECT(number) as obj4
    
FROM test_data;