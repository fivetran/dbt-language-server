WITH test_data AS (
  SELECT 
    '2023-01-01 12:00:00'::timestamp AS timestamp1,
    '2023-01-01 12:00:00'::timestamp_tz AS timestamp_tz1,
    'UTC' AS source_tz,
    'America/Los_Angeles' AS target_tz
)
SELECT
  CONVERT_TIMEZONE(target_tz, timestamp1),
  CONVERT_TIMEZONE(target_tz, timestamp_tz1),
  CONVERT_TIMEZONE(source_tz, target_tz, timestamp1),
  CONVERT_TIMEZONE('America/Los_Angeles', 'America/New_York', '2019-01-01 14:00:00'::timestamp_ntz),
  CONVERT_TIMEZONE('Europe/Warsaw', 'UTC', '2019-01-01 00:00:00'::timestamp_ntz),
  CONVERT_TIMEZONE('America/New_York', CURRENT_TIMESTAMP()) AS now_in_nyc,
  CONVERT_TIMEZONE('Europe/Paris', CURRENT_TIMESTAMP()) AS now_in_paris,
  CONVERT_TIMEZONE('Asia/Tokyo', CURRENT_TIMESTAMP()) AS now_in_tokyo,

  -- TODO:
  -- CONVERT_TIMEZONE('America/Los_Angeles', '2018-04-05 12:00:00 +02:00'),

FROM test_data;
