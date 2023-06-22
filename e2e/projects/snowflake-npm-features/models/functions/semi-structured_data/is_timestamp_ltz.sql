SELECT
    IS_TIMESTAMP_LTZ(TRUE),
    IS_TIMESTAMP_LTZ(1),
    IS_TIMESTAMP_LTZ(to_variant(to_timestamp_ltz('2017-02-24 12:00:00.456'))),
    IS_TIMESTAMP_LTZ(TO_NUMBER(1)),
    IS_TIMESTAMP_LTZ(array_construct()),
    IS_TIMESTAMP_LTZ(object_construct())
