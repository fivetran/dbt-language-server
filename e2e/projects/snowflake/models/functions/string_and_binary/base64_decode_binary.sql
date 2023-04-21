WITH sample_data AS (
  SELECT 1 AS id, 'SGVsbG8gV29ybGQ=' AS base64_string
  UNION ALL
  SELECT 2, 'U25vd2ZsaWNrcyBmcm9tIFNub3dmbGlja3M='
  UNION ALL
  SELECT 3, 'SWYgeW91IHJlYWQgdGhpcyB0aGluZ3MgYXJlIHlvdXIgc3VjY2Vzcw=='
)
SELECT id, BASE64_DECODE_BINARY(base64_string) AS binary_value
FROM sample_data;
