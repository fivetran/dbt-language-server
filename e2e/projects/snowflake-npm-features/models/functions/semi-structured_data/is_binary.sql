SELECT
    IS_BINARY(TO_VARIANT(TO_BINARY('snow', 'utf-8'))),
    IS_BINARY(1),
    IS_BINARY(array_construct())