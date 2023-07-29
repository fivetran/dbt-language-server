WITH test_data AS (
  SELECT 
    '2023-07-27 10:00:00'::timestamp AS timestamp_value
)
SELECT
  TIMESTAMPADD('YEAR', 1, timestamp_value) AS add_year,
  TIMESTAMPADD('QUARTER', 1, timestamp_value) AS add_quarter,
  TIMESTAMPADD('MONTH', 1, timestamp_value) AS add_month,
  TIMESTAMPADD('DAY', 1, timestamp_value) AS add_day,
  TIMESTAMPADD('HOUR', 1, timestamp_value) AS add_hour,
  TIMESTAMPADD('MINUTE', 1, timestamp_value) AS add_minute,
  TIMESTAMPADD('SECOND', 1, timestamp_value) AS add_second,

  TIMESTAMPADD('YEAR', 1.7, timestamp_value),
  TIMESTAMPADD('YEAR', '1', timestamp_value),
  TIMESTAMPADD('YEAR', 1, '2018-08-01'::DATE),
  TIMESTAMPADD('YEAR', 1, '2018-08-01'::timestamp),
  TIMESTAMPADD(hh, 1, '10:00:00'::time),
  TIMESTAMPADD(mins, 1, '10:00:00'::time),

  TIMESTAMPADD(YEAR, 1, '2023-07-27 10:00:00'::timestamp) AS add_year,
  TIMESTAMPADD(QUARTER, 2, '2023-07-27 10:00:00'::timestamp) AS add_quarter,
  TIMESTAMPADD(MONTH, 3, '2023-07-27 10:00:00'::timestamp) AS add_month,
  TIMESTAMPADD(DAY, 10, '2023-07-27 10:00:00'::timestamp) AS add_day,
  TIMESTAMPADD(HOUR, 12, '2023-07-27 10:00:00'::timestamp) AS add_hour,
  TIMESTAMPADD(MINUTE, 30, '2023-07-27 10:00:00'::timestamp) AS add_minute,
  TIMESTAMPADD(SECOND, 45, '2023-07-27 10:00:00'::timestamp) AS add_second

FROM test_data;
