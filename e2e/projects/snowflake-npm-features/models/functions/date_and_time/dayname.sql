WITH test_data AS (
    SELECT 
        '2022-12-01'::DATE AS date1, 
        '2023-01-31'::TIMESTAMP AS timestamp1
)

SELECT 
    date1 AS original_date1,
    timestamp1 AS original_timestamp1,
    DAYNAME(date1) AS dayname_date1, -- get day name from date1
    DAYNAME(timestamp1) AS dayname_timestamp1, -- get day name from timestamp1
    DAYNAME(TO_DATE('2015-05-01')),
    DAYNAME(TO_TIMESTAMP_NTZ('2015-05-02 10:00'))
FROM test_data;
