WITH test_data AS (
  SELECT
    'Snowflake' AS plain_text,
    '53 6E 6F 77 66 6C 61 6B 65' AS hex_encoded,
    'U25vd2ZsYWtl' AS base64_encoded
)

SELECT 
  plain_text,
  TRY_TO_BINARY(plain_text) AS binary_from_plain,
  TRY_TO_BINARY(hex_encoded, 'HEX') AS binary_from_hex,
  TRY_TO_BINARY(base64_encoded, 'BASE64') AS binary_from_base64
FROM 
  test_data;
