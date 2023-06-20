SELECT
    TRY_TO_DATE('2023-06-19') AS date_from_valid_string,
    TRY_TO_DATE('NotADate') AS date_from_invalid_string,
    TRY_TO_DATE('19/06/2023', 'DD/MM/YYYY') AS date_from_valid_string_with_format,
    TRY_TO_DATE('19-06-2023', 'DD/MM/YYYY') AS date_from_invalid_string_with_format;
