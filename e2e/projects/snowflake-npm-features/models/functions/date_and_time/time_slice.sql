WITH test_data AS (
    SELECT 
        '2022-12-01 13:45:30'::TIMESTAMP AS timestamp1, 
        '2023-01-31 15:15:45'::TIMESTAMP AS timestamp2,
        '2023-01-31'::DATE AS date1
)

SELECT 
    timestamp1 AS original_timestamp1,
    timestamp2 AS original_timestamp2,
    TIME_SLICE(timestamp1, 1, 'HOUR') AS time_slice_hour_timestamp1, -- slice timestamp1 into hour
    TIME_SLICE(timestamp1, 15, 'MINUTE') AS time_slice_15min_timestamp1, -- slice timestamp1 into 15 minutes
    TIME_SLICE(timestamp2, 1, 'DAY') AS time_slice_day_timestamp2, -- slice timestamp2 into day
    TIME_SLICE(timestamp2, 5, 'SECOND', 'END') AS time_slice_5sec_timestamp2, -- slice timestamp2 into 5 seconds
    TIME_SLICE(date1, 4, 'MONTH', 'START')
    -- TODO: check TIMESTAMP_NTZ return type https://docs.snowflake.com/en/sql-reference/functions/time_slice#returns
FROM test_data;
