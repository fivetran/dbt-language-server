WITH TestData AS (
  SELECT 
    1 AS ID,
    'John Doe' AS Name,
    'San Francisco' AS City,
    25 AS Age,
    TRUE AS IsActive,
    DATE('2023-06-13') AS JoinDate,
    1500.50 AS Salary
)

SELECT 
  ARRAY_CONSTRUCT(1, 'John Doe', true, DATE('2023-06-13'), 1500.50),
  ARRAY_CONSTRUCT(ID, Age) AS IntArray,
  ARRAY_CONSTRUCT(Name, City) AS StringArray,
  ARRAY_CONSTRUCT(IsActive) AS BoolArray,
  ARRAY_CONSTRUCT(JoinDate) AS DateArray,
  ARRAY_CONSTRUCT(Salary) AS FloatArray,
  ARRAY_CONSTRUCT() AS EmptyArray
FROM TestData;
