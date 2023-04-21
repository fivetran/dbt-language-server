WITH sample_data AS (
  SELECT 'John Smith' AS full_name
  UNION ALL
  SELECT 'Jane Doe'
  UNION ALL
  SELECT 'James Johnson'
)
SELECT full_name, REGEXP_COUNT(full_name, '[aeiou]') AS vowel_count
FROM sample_data;
