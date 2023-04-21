WITH sample_data AS (
  SELECT 'johndoe@example.com' AS email_address
  UNION ALL
  SELECT 'jane.doe@company.co.uk'
)
SELECT email_address
FROM sample_data
WHERE REGEXP_LIKE(email_address, '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
