SELECT 
    CAST('1234567' AS VARIANT),
    CAST(1 AS VARIANT),
    CAST(1 AS VARIANT) + 1,
    CAST(1 AS VARIANT) - 1,
    CAST(1 AS VARIANT) * 1,
    CAST(1 AS VARIANT) / 1,
    CAST(1 AS VARIANT) % 1,
    -- TODO: fix casting array to variant
    -- CAST(STRTOK_TO_ARRAY('1 2') AS VARIANT)[0],
