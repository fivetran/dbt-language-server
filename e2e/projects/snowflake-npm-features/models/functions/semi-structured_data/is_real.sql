SELECT
    IS_REAL(TRUE),
    IS_REAL(TO_VARIANT('Sample text')),
    IS_REAL(1),
    IS_REAL(TO_VARIANT(TO_DATE('2023-04-20', 'YYYY-MM-DD'))),
    IS_REAL(TO_NUMBER(1)),
    IS_REAL(array_construct())
