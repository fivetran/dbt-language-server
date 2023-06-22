SELECT
    IS_CHAR(TRUE),
    IS_CHAR('c'::variant),
    IS_CHAR(TO_VARIANT('c')),
    IS_CHAR(1),
    IS_CHAR(TO_NUMBER(1)),
    IS_CHAR(array_construct())
