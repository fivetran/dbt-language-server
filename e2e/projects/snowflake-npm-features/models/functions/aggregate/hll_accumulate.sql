WITH source_data AS (
  SELECT 'A' as letter UNION ALL
  SELECT 'B' UNION ALL
  SELECT 'A' UNION ALL
  SELECT 'C' UNION ALL
  SELECT 'B' UNION ALL
  SELECT 'D' UNION ALL
  SELECT 'E' UNION ALL
  SELECT 'F' UNION ALL
  SELECT 'G' UNION ALL
  SELECT 'H'
)
SELECT HLL_ACCUMULATE(letter) as hll_accumulated
FROM source_data;
