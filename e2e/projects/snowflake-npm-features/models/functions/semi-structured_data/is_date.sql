SELECT
    IS_DATE(TRUE),
    IS_DATE(TO_VARIANT('Sample text')),
    IS_DATE(1),
    IS_DATE(TO_VARIANT(TO_DATE('2023-04-20', 'YYYY-MM-DD'))),
    IS_DATE(TO_NUMBER(1)),
    IS_DATE(array_construct())
