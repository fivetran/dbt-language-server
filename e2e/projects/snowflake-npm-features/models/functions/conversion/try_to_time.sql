SELECT
    TRY_TO_TIME('14:30:00') AS time_from_valid_string,
    TRY_TO_TIME('NotATime') AS time_from_invalid_string,
    TRY_TO_TIME('14:30:00', 'HH24:MI:SS') AS time_from_valid_string_with_format,
    TRY_TO_TIME('14-30-00', 'HH24:MI:SS') AS time_from_invalid_string_with_format;
