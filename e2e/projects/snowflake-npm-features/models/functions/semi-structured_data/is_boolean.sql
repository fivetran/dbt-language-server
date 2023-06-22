SELECT
    IS_BOOLEAN(TRUE),
    IS_BOOLEAN(TO_VARIANT('Sample text')),
    IS_BOOLEAN(1),
    IS_BOOLEAN(TO_NUMBER(1)),
    IS_BOOLEAN(array_construct())
