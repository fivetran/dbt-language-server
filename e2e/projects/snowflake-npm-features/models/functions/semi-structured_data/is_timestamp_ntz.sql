SELECT
    IS_TIMESTAMP_NTZ(TRUE),
    IS_TIMESTAMP_NTZ(1),
    IS_TIMESTAMP_NTZ(to_variant(to_timestamp_ntz('2017-02-24 12:00:00.456'))),
    IS_TIMESTAMP_NTZ(TO_NUMBER(1)),
    IS_TIMESTAMP_NTZ(array_construct()),
    IS_TIMESTAMP_NTZ(object_construct())
