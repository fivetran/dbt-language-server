SELECT 
    CAST(to_variant('{"a":"1"}') AS OBJECT),
    CAST(cast('{"a":"1"}' as variant) AS OBJECT),
    CAST(parse_json('{"a":"1"}') AS OBJECT),

    CAST(CAST(to_variant('{"a":"1"}') AS OBJECT) as varchar),
    CAST(CAST(to_variant('{"a":"1"}') AS OBJECT) as variant),

    -- TODO: cast to array
