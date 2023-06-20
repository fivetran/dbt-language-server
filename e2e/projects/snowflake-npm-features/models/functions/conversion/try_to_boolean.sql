SELECT
    TRY_TO_BOOLEAN('TRUE') AS boolean_from_valid_string,
    TRY_TO_BOOLEAN('NotBoolean') AS boolean_from_invalid_string;
