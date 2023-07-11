WITH test_data AS (
    SELECT PARSE_JSON('{"person": {"name": "John", "age": 30, "grades": [90, 85, 88]}}') AS j
)
SELECT
    GET_PATH(j, 'person'),
    GET_PATH(j, 'person.grades[0]'),
    -- TODO:
    -- GET_PATH(j, 'person.grades')[0],
    
    j:person.name,
    j:person.name::string,
    j:person.grades[0],
    j:person.grades[0]::number,
    j:fo,
    
    -- TODO:
    -- j:for,
    
from test_data