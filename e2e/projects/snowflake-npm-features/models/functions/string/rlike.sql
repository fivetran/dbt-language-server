WITH sample_data AS (
  SELECT 'John Smith' AS full_name
  UNION ALL
  SELECT 'Jane Doe'
  UNION ALL
  SELECT 'James Johnson'
)
SELECT full_name
FROM sample_data
WHERE full_name RLIKE '^J';
