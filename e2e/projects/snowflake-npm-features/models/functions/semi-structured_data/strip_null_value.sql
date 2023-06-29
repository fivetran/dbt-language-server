SELECT
    STRIP_NULL_VALUE(TRUE),
    STRIP_NULL_VALUE(GET_PATH(parse_json('{"a": "b"}'), 'a')),
    STRIP_NULL_VALUE(1),
    STRIP_NULL_VALUE(TO_VARIANT(TO_DATE('2023-04-20', 'YYYY-MM-DD'))),
    STRIP_NULL_VALUE(TO_NUMBER(1)),
    STRIP_NULL_VALUE(array_construct()),
    STRIP_NULL_VALUE(object_construct())
