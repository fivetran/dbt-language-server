WITH TestData AS (
  SELECT 
    ARRAY_CONSTRUCT(1, 2, 3) AS IntArray,
    ARRAY_CONSTRUCT('John Doe', 'Jane Doe') AS StringArray,
    ARRAY_CONSTRUCT(TRUE, FALSE) AS BoolArray,
    ARRAY_CONSTRUCT(DATE('2023-06-01'), DATE('2023-06-02')) AS DateArray,
    ARRAY_CONSTRUCT(1500.50, 2000.75) AS FloatArray
)

SELECT 
  ARRAY_APPEND(IntArray, 4) AS AppendedIntArray,
  ARRAY_APPEND(StringArray, 'Sam Doe') AS AppendedStringArray,
  ARRAY_APPEND(BoolArray, TRUE) AS AppendedBoolArray,
  ARRAY_APPEND(DateArray, DATE('2023-06-03')) AS AppendedDateArray,
  ARRAY_APPEND(FloatArray, 2500.95) AS AppendedFloatArray,
  ARRAY_APPEND(ARRAY_CONSTRUCT(), 1)
FROM TestData;
