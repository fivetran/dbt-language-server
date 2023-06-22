SELECT
    CHECK_JSON('{"name": "John"}'),
    CHECK_JSON('NotJson'),
    CHECK_JSON(to_variant('1'))
