SELECT
    IS_NULL_VALUE(TRUE),
    IS_NULL_VALUE(GET_PATH(parse_json('{"a": null}'), 'a')),
    IS_NULL_VALUE(1),
    IS_NULL_VALUE(TO_VARIANT(TO_DATE('2023-04-20', 'YYYY-MM-DD'))),
    IS_NULL_VALUE(TO_NUMBER(1)),
    IS_NULL_VALUE(array_construct()),
    IS_NULL_VALUE(object_construct())
