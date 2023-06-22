SELECT
    TRY_PARSE_JSON('{"key": "value"}') AS valid_json,
    TRY_PARSE_JSON('{"key": "value}') AS invalid_json,
    TRY_PARSE_JSON('not json') AS non_json_string,
    TRY_PARSE_JSON(to_variant('{"key": "value"}')) AS non_json_string;
