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
),

hll_accumulated AS (
  SELECT HLL_ACCUMULATE(letter) as hll
  FROM source_data
),

hll_combined AS (
  SELECT HLL_COMBINE(hll) as hll_combined
  FROM hll_accumulated
)

SELECT HLL_EXPORT(hll_combined) as hll_exported
FROM hll_combined;
