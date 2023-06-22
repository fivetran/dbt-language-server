SELECT
    AS_DECIMAL(to_variant(12345)),
    AS_DECIMAL(to_variant(123.45), 10, 2),
    AS_DECIMAL(to_variant(123.45), 10)
