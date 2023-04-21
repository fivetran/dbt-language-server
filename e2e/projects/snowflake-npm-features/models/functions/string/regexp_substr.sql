WITH sample_data AS (
  SELECT 'John Doe - 123 Main St, Anytown USA' AS full_address
)
SELECT REGEXP_SUBSTR(full_address, '[A-Z]{2}', 1) AS state
FROM sample_data;
