WITH sample_data AS (
  SELECT 1 AS id, 'Hello world' AS string
  UNION ALL
  SELECT 2, 'Snowflakes for Snowflakes'
  UNION ALL
  SELECT 3, 'If you read this things are your success'
)
SELECT id, BASE64_ENCODE(string) AS base64_string
FROM sample_data;
