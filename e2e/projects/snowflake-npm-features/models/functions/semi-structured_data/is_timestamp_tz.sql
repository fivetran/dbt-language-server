SELECT
    IS_TIMESTAMP_TZ(TRUE),
    IS_TIMESTAMP_TZ(1),
    IS_TIMESTAMP_TZ(to_variant(to_timestamp_tz('2017-02-24 12:00:00.456'))),
    IS_TIMESTAMP_TZ(TO_NUMBER(1)),
    IS_TIMESTAMP_TZ(array_construct()),
    IS_TIMESTAMP_TZ(object_construct())
