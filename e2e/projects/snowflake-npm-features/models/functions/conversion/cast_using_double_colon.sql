WITH test_data AS (
  SELECT
    123 AS int_value,
    45.67 AS float_value,
    '2023-06-19' AS date_string,
    '12:34:56' AS time_string,
    'true' AS boolean_string
)
SELECT
    int_value::STRING AS int_to_string,
    float_value::STRING AS float_to_string,
    date_string::DATE AS string_to_date,
    boolean_string::BOOLEAN AS string_to_boolean,
    int_value::FLOAT AS int_to_float,
    float_value::INT AS float_to_int,
    date_string::TIMESTAMP AS string_to_timestamp,
    true::boolean,
    'f'::char,
    1::double, 1::double precision,
    'SGVsbG8gV29ybGQh'::binary, '20:57'::time, '2023-06-19T12:34:56-07:00'::timestamp,
    1::variant,
    ('{}'::variant)::object,
    -- TODO:
    -- ('1'::variant)::array,
    -- ['1']::array,

FROM
    test_data;
