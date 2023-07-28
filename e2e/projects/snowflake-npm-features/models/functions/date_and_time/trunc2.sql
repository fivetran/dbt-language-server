WITH test_data AS (
  SELECT 
    123.456 AS num_value,
    '2023-07-27 10:30:45'::timestamp AS timestamp_value
)
SELECT
  TRUNC(timestamp_value::date, 'MM') AS trunc_month,
  TRUNC(timestamp_value::date, 'YYYY') AS trunc_year,
  TRUNC(timestamp_value::date, 'DD') AS trunc_day,
  TRUNC(timestamp_value, 'HH') AS trunc_hour,
  TRUNC(timestamp_value, 'MI') AS trunc_minute,

  TRUNC(timestamp_value::date, 'm') AS trunc_month,
  TRUNC(timestamp_value::date, 'YYY') AS trunc_year,
  TRUNC(timestamp_value::date, 'D') AS trunc_day,
  TRUNC(timestamp_value, 'H') AS trunc_hour,
  TRUNC(timestamp_value, 'mins') AS trunc_minute
  
FROM test_data;
