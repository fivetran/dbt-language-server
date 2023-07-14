SELECT 
    PARSE_JSON('{"key":"value"}'):"key",
    PARSE_JSON('{"k":"value"}'):k,
    PARSE_JSON('{"a":{"b":[1, 2, 3]}}'):a.b[0],
