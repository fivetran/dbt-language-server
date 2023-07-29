WITH test_data AS (
    SELECT 
        '2022-12-01'::DATE AS date1, 
        '2023-01-31'::TIMESTAMP AS timestamp1
)

SELECT 
    date1 AS original_date1,
    timestamp1 AS original_timestamp1,
    previous_day(date1, 'SUNDAY') AS next_sunday_date1,
    previous_day(timestamp1, 'WEDNESDAY') AS next_wednesday_timestamp1,
    previous_day(date1, 'su')
FROM test_data;
