WITH test_data AS (
    SELECT PARSE_JSON('{"person": {"name": "John", "age": 30}}') AS j
)
SELECT
    GET_PATH(j, 'person'),
    j:person.name
from test_data