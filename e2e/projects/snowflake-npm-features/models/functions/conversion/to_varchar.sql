WITH TestData AS (
    SELECT 
        123 AS test_number,
        CURRENT_DATE AS test_date,
        CURRENT_TIME AS test_time,
        CURRENT_TIMESTAMP AS test_timestamp,
        TRUE AS test_boolean
)

SELECT 
    TO_VARCHAR(test_number) AS varchar_number,
    TO_VARCHAR(test_date, 'YYYY-MM-DD') AS varchar_date,
    TO_VARCHAR(test_time, 'HH24:MI:SS') AS varchar_time,
    TO_VARCHAR(test_timestamp, 'YYYY-MM-DD HH24:MI:SS') AS varchar_timestamp,
    TO_VARCHAR(test_boolean) AS varchar_boolean
FROM TestData;
