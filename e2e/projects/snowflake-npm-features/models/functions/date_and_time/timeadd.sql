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
    timeadd(day, inc, initial_date) AS days_added_date,
    timeadd(day, inc, initial_timestamp) AS days_added_timestamp,
    
    -- Add hours
    timeadd(hour, inc, initial_time) AS hours_added_time,
    timeadd(hour, inc, initial_timestamp) AS hours_added_timestamp,
    
    -- Add minutes
    timeadd(minute, inc, initial_time) AS minutes_added_time,
    timeadd(minute, inc, initial_timestamp) AS minutes_added_timestamp,

    -- Add seconds
    timeadd(second, inc, initial_time) AS seconds_added_time,
    timeadd(second, inc, initial_timestamp) AS seconds_added_timestamp,
    
    -- Add weeks
    timeadd(week, inc, initial_date) AS weeks_added_date,
    timeadd(week, inc, initial_timestamp) AS weeks_added_timestamp,
    
    -- Add months
    timeadd(month, inc, initial_date) AS months_added_date,
    timeadd(month, inc, initial_timestamp) AS months_added_timestamp,
    
    -- Add quarters
    timeadd(quarter, inc, initial_date) AS quarters_added_date,
    timeadd(quarter, inc, initial_timestamp) AS quarters_added_timestamp,
    
    -- Add years
    timeadd(year, inc, initial_date) AS years_added_date,
    timeadd(year, inc, initial_timestamp) AS years_added_timestamp,

    timeadd('month', -1, initial_timestamp),
    timeadd('day', 0, initial_date),
    timeadd('day', 1.4, initial_date),

    timeadd('YEAR', 1.7, initial_timestamp),
    timeadd('YEAR', '1', initial_timestamp),
    timeadd('YEAR', 1, '2018-08-01'::DATE),
    timeadd('YEAR', 1, '2018-08-01'::timestamp),
    timeadd(hh, 1, '10:00:00'::time),
    timeadd(mins, 1, '10:00:00'::time),

    timeadd('HOUR', 1, initial_timestamp),
    timeadd('MINUTE', -15, initial_timestamp),
    timeadd('SECOND', 30, initial_timestamp),
    timeadd('DAY', 0, initial_timestamp),
    timeadd(year, 2, TO_DATE('2013-05-08')),
    timeadd(hour, 2.2, '2013-05-08'),
    timeadd(HOUR, 2, TO_TIMESTAMP_LTZ('2013-05-08 11:22:33.444')),
    timeadd(MOnTH, 1, '2000-01-31'::DATE)

FROM test_data;
