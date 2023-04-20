WITH sales_data AS (
    SELECT 2 AS x, 3 AS y
    UNION ALL
    SELECT 4, 6
    UNION ALL
    SELECT 6, 8
    UNION ALL
    SELECT 8, 10
)
SELECT COVAR_SAMP(x, y) AS sample_covariance FROM sales_data;
