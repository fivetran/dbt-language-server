WITH test_data AS (
    SELECT
        '2023-06-19 14:30:00' AS timestamp_string,
        1592581800000 AS epoch_milliseconds
)
SELECT
    DATE(timestamp_string) AS date_from_timestamp,
    -- TODO:
    -- DATE(epoch_milliseconds) AS date_from_epoch_milliseconds
FROM
    test_data;
