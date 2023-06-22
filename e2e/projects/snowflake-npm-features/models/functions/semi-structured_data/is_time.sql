SELECT
    IS_TIME(TRUE),
    IS_TIME(1),
    IS_TIME(to_variant(to_time('20:57:01.123456789+07:00'))),
    IS_TIME(TO_NUMBER(1)),
    IS_TIME(array_construct()),
    IS_TIME(object_construct())
