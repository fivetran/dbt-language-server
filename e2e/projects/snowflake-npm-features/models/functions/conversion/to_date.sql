WITH test_data AS (
    SELECT
        '2023-06-19 14:30:00' AS timestamp_string,
        '2023-06-19' AS date_string,
        '14:30:00' AS time_string
)
SELECT
    TO_DATE(timestamp_string) AS date_from_timestamp,
    TO_DATE(timestamp_string, 'YYYY-MM-DD HH24:MI:SS') AS date_from_timestamp_with_format,
    TO_DATE(date_string) AS date_from_date_string,
    TO_DATE(date_string, 'YYYY-MM-DD') AS date_from_date_string_with_format,
    TO_DATE(time_string, 'HH24:MI:SS') AS date_from_time_string_with_format,
    TO_DATE('2023-04-20', 'YYYY-MM-DD')
FROM
    test_data;
