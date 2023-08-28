WITH test_data AS (
    SELECT PARSE_JSON('{"person": {"name": "John", "age": 30, "grades": [90, 85, 88]}}') AS j
)
SELECT
    GET_PATH(j, 'person'),
    GET_PATH(j, 'person.grades[0]'),
    -- -- TODO:
    -- -- GET_PATH(j, 'person.grades')[0],
    -- PARSE_JSON(''):for,
    PARSE_JSON(''):forr,
    j:"person.name",
    

    j:person.name,
    j:"person".name,
    j:"person"."name",
    j:person."name",
    j:person.name::string,
    j:person.grades[0],
    j:person.grades[0]::number,

    -- TODO:
    -- j:forr,
    -- j:for,
    -- j:select,
    
from test_data