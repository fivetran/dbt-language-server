WITH test_data AS (
    SELECT 
        '2023-01-01 15:30:00'::timestamp AS sample_timestamp
)

SELECT 
    sample_timestamp,

    -- Date trunc on timestamp
    DATE_TRUNC(year, sample_timestamp) AS year_trunc_timestamp,
    DATE_TRUNC(quarter, sample_timestamp) AS quarter_trunc_timestamp,
    DATE_TRUNC(month, sample_timestamp) AS month_trunc_timestamp,
    DATE_TRUNC(week, sample_timestamp) AS week_trunc_timestamp,
    DATE_TRUNC(day, sample_timestamp) AS day_trunc_timestamp,
    DATE_TRUNC(hour, sample_timestamp) AS hour_trunc_timestamp,
    DATE_TRUNC(minute, sample_timestamp) AS minute_trunc_timestamp,
    DATE_TRUNC(second, sample_timestamp) AS second_trunc_timestamp

FROM test_data;
