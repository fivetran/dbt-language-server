WITH sample_data AS (
  SELECT 1 AS id, TIME '12:34:56' AS time
  UNION ALL
  SELECT 2, TIME '13:14:30'
  UNION ALL
  SELECT 3, TIME '09:45:10'
)
SELECT id, 
       EXTRACT(HOUR FROM time) AS hour, 
       EXTRACT(MINUTE FROM time) AS minute, 
       EXTRACT(SECOND FROM time) AS second
FROM sample_data;
