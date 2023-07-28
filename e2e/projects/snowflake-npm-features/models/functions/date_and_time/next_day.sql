WITH test_data AS (
    SELECT 
        '2022-12-01'::DATE AS date1, 
        '2023-01-31'::TIMESTAMP AS timestamp1
)

SELECT 
    date1 AS original_date1,
    timestamp1 AS original_timestamp1,
    NEXT_DAY(date1, 'SUNDAY') AS next_sunday_date1, -- get the next Sunday after date1
    NEXT_DAY(timestamp1, 'WEDNESDAY') AS next_wednesday_timestamp1 -- get the next Wednesday after timestamp1
FROM test_data;
