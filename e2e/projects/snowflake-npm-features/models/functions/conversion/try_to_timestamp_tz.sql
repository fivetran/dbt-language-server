SELECT
    TRY_TO_TIMESTAMP_TZ('2023-06-19 14:30:00+02:00') AS timestamp_tz_from_valid_string,
    TRY_TO_TIMESTAMP_TZ('NotATimestamp') AS timestamp_tz_from_invalid_string,
    TRY_TO_TIMESTAMP_TZ('2023-06-19 14:30:00+02:00', 'YYYY-MM-DD HH24:MI:SS-TZH:TZM') AS timestamp_tz_from_valid_string_with_format,
    TRY_TO_TIMESTAMP_TZ('2023-06-19 14-30-00+02:00', 'YYYY-MM-DD HH24:MI:SS-TZH:TZM') AS timestamp_tz_from_invalid_string_with_format;
