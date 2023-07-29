WITH test_data AS (
    SELECT 
        '2023-01-01'::date AS sample_date,
        '2023-01-01 15:30:00'::timestamp AS sample_timestamp
)

SELECT 
    sample_date,
    sample_timestamp,

    -- Last day of month for date, time, and timestamp
    LAST_DAY(sample_date) AS last_day_of_month_date,
    LAST_DAY(sample_timestamp) AS last_day_of_month_timestamp,
    LAST_DAY(TO_DATE('2015-05-08T23:39:20.123-07:00'), 'year'),
    LAST_DAY(TO_DATE('2015-05-08T23:39:20.123-07:00'), year),
    LAST_DAY(TO_DATE('2015-05-08T23:39:20.123-07:00'), month)
FROM test_data;
