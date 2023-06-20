SELECT
    TRY_TO_TIMESTAMP_NTZ('2023-06-19 14:30:00') AS timestamp_ntz_from_valid_string,
    TRY_TO_TIMESTAMP_NTZ('NotATimestamp') AS timestamp_ntz_from_invalid_string,
    TRY_TO_TIMESTAMP_NTZ('2023-06-19 14:30:00', 'YYYY-MM-DD HH24:MI:SS') AS timestamp_ntz_from_valid_string_with_format,
    TRY_TO_TIMESTAMP_NTZ('2023-06-19 14-30-00', 'YYYY-MM-DD HH24:MI:SS') AS timestamp_ntz_from_invalid_string_with_format;
