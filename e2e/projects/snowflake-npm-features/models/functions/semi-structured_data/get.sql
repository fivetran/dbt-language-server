SELECT
    GET(PARSE_JSON('{"name": "John", "age": 30}'), 'name'),
    GET(ARRAY_CONSTRUCT(11, 22), 1),
    GET(TO_VARIANT(PARSE_JSON('{"name": "John", "age": 30}')), 'name'),
    GET(TO_VARIANT(ARRAY_CONSTRUCT(11, 22)), 1)
