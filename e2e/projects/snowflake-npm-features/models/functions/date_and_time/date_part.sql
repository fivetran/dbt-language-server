WITH test_data AS (
    SELECT 
        '2023-01-01'::date AS sample_date,
        '15:30:00'::time AS sample_time,
        '2023-01-01 15:30:00'::timestamp AS sample_timestamp
)

SELECT 
    sample_date,
    sample_time,
    sample_timestamp,


    -- Date part from date
    DATE_PART(year, sample_date) AS year_date,
    DATE_PART(quarter, sample_date) AS quarter_date,
    DATE_PART(month, sample_date) AS month_date,
    DATE_PART(week, sample_date) AS week_date,
    DATE_PART(day, sample_date) AS day_date,

    -- Date part from time
    DATE_PART(hour, sample_time) AS hour_time,
    DATE_PART(minute, sample_time) AS minute_time,
    DATE_PART(second, sample_time) AS second_time,

    -- Date part from timestamp
    DATE_PART(year, sample_timestamp) AS year_timestamp,
    DATE_PART(quarter, sample_timestamp) AS quarter_timestamp,
    DATE_PART(month, sample_timestamp) AS month_timestamp,
    DATE_PART(week, sample_timestamp) AS week_timestamp,
    DATE_PART(day, sample_timestamp) AS day_timestamp,
    DATE_PART(hour, sample_timestamp) AS hour_timestamp,
    DATE_PART(minute, sample_timestamp) AS minute_timestamp,
    DATE_PART(second, sample_timestamp) AS second_timestamp,

    -- Date part from date
    DATE_PART('year', sample_date) AS year_date,
    DATE_PART('quarter', sample_date) AS quarter_date,
    DATE_PART('month', sample_date) AS month_date,
    DATE_PART('week', sample_date) AS week_date,
    DATE_PART('day', sample_date) AS day_date,

    -- Date part from time
    DATE_PART('hour', sample_time) AS hour_time,
    DATE_PART('minute', sample_time) AS minute_time,
    DATE_PART('second', sample_time) AS second_time,

    -- Date part from timestamp
    DATE_PART('year', sample_timestamp) AS year_timestamp,
    DATE_PART('quarter', sample_timestamp) AS quarter_timestamp,
    DATE_PART('month', sample_timestamp) AS month_timestamp,
    DATE_PART('week', sample_timestamp) AS week_timestamp,
    DATE_PART('day', sample_timestamp) AS day_timestamp,
    DATE_PART('hour', sample_timestamp) AS hour_timestamp,
    DATE_PART('minute', sample_timestamp) AS minute_timestamp,
    DATE_PART('second', sample_timestamp) AS second_timestamp

FROM test_data;
