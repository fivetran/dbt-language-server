WITH test_data AS (
    SELECT 
        '2022-12-01'::TIMESTAMP AS timestamp1, 
        '2023-01-31'::DATE AS date1, 
        '2023-02-28'::DATE AS date2
)

SELECT 
    timestamp1 AS original_timestamp,
    date1 AS original_date1,
    date2 AS original_date2,
    ADD_MONTHS(timestamp1, 1) AS timestamp1_plus_one_month, -- add 1 month to timestamp1
    ADD_MONTHS(date1, -1) AS date1_minus_one_month, -- subtract 1 month from date1
    ADD_MONTHS(date2, 0) AS date2_no_change, -- add 0 months to date2, so no change
    ADD_MONTHS('2016-02-29', 1),
    ADD_MONTHS('2016-02-29'::date, 1),
    ADD_MONTHS('2016-05-31'::date, -1),

    ADD_MONTHS(timestamp1, 1.1),
    ADD_MONTHS('2016-05-15'::timestamp_ntz, 2)
FROM test_data;
