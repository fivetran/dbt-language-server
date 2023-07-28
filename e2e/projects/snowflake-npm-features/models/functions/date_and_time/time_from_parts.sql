WITH test_data AS (
    SELECT 
        13 AS hour1, 
        15 AS minute1, 
        36 AS second1, 
        125 AS millisecond1,
        20 AS hour2,
        45 AS minute2,
        50 AS second2
)

SELECT 
    TIME_FROM_PARTS(hour1, minute1, second1) AS time1, -- construct time from hour1, minute1, and second1
    TIME_FROM_PARTS(hour1, minute1, second1, millisecond1) AS time2, -- construct time from hour1, minute1, second1, and millisecond1
    TIME_FROM_PARTS(hour2, minute2, second2) AS time3, -- construct time from hour2, minute2, and second2
    TIME_FROM_PARTS(1, 2, 3),
    TIME_FROM_PARTS(1, 2, 3, 4),
    TIME_FROM_PARTS(1.4, 2.4, 3.2, 4.334)
FROM test_data;
