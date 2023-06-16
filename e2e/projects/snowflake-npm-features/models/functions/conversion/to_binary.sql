WITH test_data AS (
    SELECT 
        'Snowflake' AS text_utf8,
        '53 6e 6f 77 66 6c 61 6b 65' AS text_hex,
        'U25vd2ZsYWtl' AS text_base64
)
SELECT 
    TO_BINARY(text_utf8, 'UTF8') AS to_binary_utf8_explicit,
    TO_BINARY(text_hex, 'HEX') AS to_binary_hex,
    TO_BINARY(text_base64) AS to_binary_base64,
    TO_BINARY(text_base64, 'BASE64') AS to_binary_base64_explicit,
    TO_BINARY(TO_VARIANT(text_base64)) AS to_binary_variant
FROM test_data;
