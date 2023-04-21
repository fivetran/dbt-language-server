
WITH sample_data AS (
    SELECT DATE('2022-05-01') AS start_date, DATE('2022-05-10') AS end_date
    UNION ALL
    SELECT DATE('2022-04-15'), DATE('2022-04-20')
    UNION ALL
    SELECT DATE('2022-03-01'), DATE('2022-03-31')
)
SELECT end_date - start_date AS days_between FROM sample_data;
