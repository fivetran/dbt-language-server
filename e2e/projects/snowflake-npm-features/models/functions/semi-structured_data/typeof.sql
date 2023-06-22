SELECT
    TYPEOF(123) AS int_type,
    TYPEOF(123.45) AS float_type,
    TYPEOF(to_variant('text')) AS string_type,
    TYPEOF(to_variant(CURRENT_DATE)) AS date_type,
    TYPEOF(TO_OBJECT(to_variant('{"key": "value"}'))) AS object_type;
