WITH TestData AS (
  SELECT 
    1 AS ID,
    'John Doe' AS Name,
    'San Francisco' AS City,
    25 AS Age,
    TRUE AS IsActive,
    NULL AS NullValue,
    DATE('2023-06-13') AS JoinDate,
    1500.50 AS Salary
)

SELECT 
  ARRAY_CONSTRUCT_COMPACT(ID, Age, NullValue) AS IntArray,
  ARRAY_CONSTRUCT_COMPACT(Name, City, NullValue) AS StringArray,
  ARRAY_CONSTRUCT_COMPACT(IsActive, NullValue) AS BoolArray,
  ARRAY_CONSTRUCT_COMPACT(JoinDate, NullValue) AS DateArray,
  ARRAY_CONSTRUCT_COMPACT(Salary, NullValue) AS FloatArray,
  ARRAY_CONSTRUCT_COMPACT(1, 'John Doe', true, DATE('2023-06-13'), 1500.50),
  ARRAY_CONSTRUCT_COMPACT()
FROM TestData;
