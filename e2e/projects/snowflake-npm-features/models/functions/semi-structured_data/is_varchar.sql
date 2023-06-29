SELECT
    IS_VARCHAR(TRUE),
    IS_VARCHAR('c'::variant),
    IS_VARCHAR(TO_VARIANT('c')),
    IS_VARCHAR(1),
    IS_VARCHAR(TO_NUMBER(1)),
    IS_VARCHAR(array_construct())
