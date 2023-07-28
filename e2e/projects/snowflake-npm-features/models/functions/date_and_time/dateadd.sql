WITH test_data AS (
    SELECT 
        '2023-01-01'::date AS initial_date,
        '15:30:00'::time AS initial_time,
        '2023-01-01 15:30:00'::timestamp AS initial_timestamp,
        5 AS inc
)

SELECT 
    initial_date,
    initial_time,
    initial_timestamp,
    inc,

    -- Add days
    DATEADD(day, inc, initial_date) AS days_added_date,
    DATEADD(day, inc, initial_timestamp) AS days_added_timestamp,
    
    -- Add hours
    DATEADD(hour, inc, initial_time) AS hours_added_time,
    DATEADD(hour, inc, initial_timestamp) AS hours_added_timestamp,
    
    -- Add minutes
    DATEADD(minute, inc, initial_time) AS minutes_added_time,
    DATEADD(minute, inc, initial_timestamp) AS minutes_added_timestamp,

    -- Add seconds
    DATEADD(second, inc, initial_time) AS seconds_added_time,
    DATEADD(second, inc, initial_timestamp) AS seconds_added_timestamp,
    
    -- Add weeks
    DATEADD(week, inc, initial_date) AS weeks_added_date,
    DATEADD(week, inc, initial_timestamp) AS weeks_added_timestamp,
    
    -- Add months
    DATEADD(month, inc, initial_date) AS months_added_date,
    DATEADD(month, inc, initial_timestamp) AS months_added_timestamp,
    
    -- Add quarters
    DATEADD(quarter, inc, initial_date) AS quarters_added_date,
    DATEADD(quarter, inc, initial_timestamp) AS quarters_added_timestamp,
    
    -- Add years
    DATEADD(year, inc, initial_date) AS years_added_date,
    DATEADD(year, inc, initial_timestamp) AS years_added_timestamp,

    DATEADD('month', -1, initial_timestamp),
    DATEADD('day', 0, initial_date),
    DATEADD('day', 1.4, initial_date),

    dateadd('YEAR', 1.7, initial_timestamp),
    dateadd('YEAR', '1', initial_timestamp),
    dateadd('YEAR', 1, '2018-08-01'::DATE),
    dateadd('YEAR', 1, '2018-08-01'::timestamp),
    dateadd(hh, 1, '10:00:00'::time),
    dateadd(mins, 1, '10:00:00'::time),

    dateadd('HOUR', 1, initial_timestamp),
    dateadd('MINUTE', -15, initial_timestamp),
    dateadd('SECOND', 30, initial_timestamp),
    dateadd('DAY', 0, initial_timestamp),
    dateadd(year, 2, TO_DATE('2013-05-08')),
    dateadd(hour, 2.2, '2013-05-08'),
    dateadd(HOUR, 2, TO_TIMESTAMP_LTZ('2013-05-08 11:22:33.444')),
    dateadd(MOnTH, 1, '2000-01-31'::DATE)

FROM test_data;
