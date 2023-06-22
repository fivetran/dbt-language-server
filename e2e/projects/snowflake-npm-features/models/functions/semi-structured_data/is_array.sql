SELECT
    IS_ARRAY(TRUE),
    IS_ARRAY(TO_VARIANT('Sample text')),
    IS_ARRAY(1),
    IS_ARRAY(TO_VARIANT(TO_DATE('2023-04-20', 'YYYY-MM-DD'))),
    IS_ARRAY(TO_NUMBER(1)),
    IS_ARRAY(array_construct())
