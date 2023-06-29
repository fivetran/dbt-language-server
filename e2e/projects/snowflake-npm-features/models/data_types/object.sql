SELECT 
    CAST(to_variant('{"a":"1"}') AS OBJECT),
    CAST(cast('{"a":"1"}' as variant) AS OBJECT),
    CAST(parse_json('{"a":"1"}') AS OBJECT),

    CAST(CAST(to_variant('{"a":"1"}') AS OBJECT) as varchar),
    CAST(CAST(to_variant('{"a":"1"}') AS OBJECT) as variant),

    -- TODO: cast to array

    -- TODO: check if it is possible to cast the following types:
    -- CAST('{"a":"1"}' AS OBJECT),
    -- CAST(TO_BINARY('{"name":"John"}', 'utf8') AS OBJECT),