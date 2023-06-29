SELECT
    TRY_TO_DOUBLE('123.45') AS double_from_valid_string,
    TRY_TO_DOUBLE('NotDouble') AS double_from_invalid_string;
