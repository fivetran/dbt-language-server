SELECT
    IS_OBJECT(TRUE),
    IS_OBJECT(TO_VARIANT('Sample text')),
    IS_OBJECT(1),
    IS_OBJECT(TO_VARIANT(TO_DATE('2023-04-20', 'YYYY-MM-DD'))),
    IS_OBJECT(TO_NUMBER(1)),
    IS_OBJECT(array_construct()),
    IS_OBJECT(object_construct())
