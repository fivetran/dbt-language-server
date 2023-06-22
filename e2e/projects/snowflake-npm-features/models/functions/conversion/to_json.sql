SELECT
    TO_JSON(OBJECT_INSERT(OBJECT_INSERT(OBJECT_CONSTRUCT(), 'name', 'John'), 'age', 30)),
    TO_JSON(PARSE_JSON('{"name": "John", "age": 30}')),
    TO_JSON(object_construct('a', 1)), 
    TO_JSON(null),
    TO_JSON('null'::VARIANT)
