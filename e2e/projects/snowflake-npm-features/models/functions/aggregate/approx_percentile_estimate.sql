WITH sample_data AS (
    SELECT 1 AS val UNION ALL
    SELECT 2 AS val UNION ALL
    SELECT 3 AS val UNION ALL
    SELECT 4 AS val UNION ALL
    SELECT 5 AS val UNION ALL
    SELECT 6 AS val UNION ALL
    SELECT 7 AS val UNION ALL
    SELECT 8 AS val UNION ALL
    SELECT 9 AS val UNION ALL
    SELECT 10 AS val
),
accumulate AS (
    SELECT 
        APPROX_PERCENTILE_ACCUMULATE(val) AS percentile_accum
    FROM 
        sample_data
    GROUP BY 
        val
),
combine AS (
    SELECT 
        APPROX_PERCENTILE_COMBINE(percentile_accum) AS percentile_combine
    FROM 
        accumulate
)
SELECT 
    APPROX_PERCENTILE_ESTIMATE(percentile_combine, 0.5) AS percentile_estimate
FROM 
    combine;
