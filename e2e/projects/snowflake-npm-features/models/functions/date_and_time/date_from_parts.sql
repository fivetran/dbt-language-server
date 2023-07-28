WITH test_data AS (
  SELECT 
    2023 AS year,
    07 AS month,
    27 AS day
)
SELECT
  DATE_FROM_PARTS(year, month, day),
  DATE_FROM_PARTS(2023.2, 1.3, 1.2),
  DATE_FROM_PARTS(20232, 14, 99),
  DATE_FROM_PARTS('2000', '11', '1'),
FROM test_data;
