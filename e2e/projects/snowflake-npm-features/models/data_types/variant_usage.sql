-- Create a temporary table with sample data
WITH my_table AS (
  SELECT 
    1 AS id, 
    CAST(123 AS VARIANT) AS data
  UNION ALL
  SELECT 
    2 AS id, 
    CAST('Hello, world!' AS VARIANT) AS data
  -- UNION ALL
  -- SELECT 
  --   3 AS id, 
  --   CAST(ARRAY_CONSTRUCT(1, 2, 3) AS VARIANT) AS data
  -- UNION ALL
  -- SELECT 
  --   4 AS id, 
  --   CAST(OBJECT_INSERT(OBJECT_INSERT(OBJECT_INSERT(NULL, 'key1', 'value1'), 'key2', 'value2'), 'key3', 'value3') AS VARIANT) AS data
)

-- Query the data
SELECT
  id,
  data
FROM
  my_table;
