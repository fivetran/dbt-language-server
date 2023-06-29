WITH test_data AS (
    SELECT 
        PARSE_JSON('{"Name":"John", "Age":35, "Country":"USA"}') as variant
        -- ARRAY_CONSTRUCT('John', 35, 'USA') as array
)

SELECT
    -- Convert a VARIANT to an OBJECT
    AS_OBJECT(variant) as obj1,

    AS_OBJECT(1), 
    AS_OBJECT(TO_VARIANT(1)), 
    
    -- TODO:
    -- Convert an ARRAY to an OBJECT
    -- AS_OBJECT(array) as obj2
    
FROM test_data;
