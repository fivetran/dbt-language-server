{{
  config(
    schema='dbt_ls_e2e_dataset',
    materialized='table'
  ) 
}}
with morning as (
  SELECT hour FROM UNNEST(GENERATE_ARRAY(0, 11)) hour
), evening as (
  SELECT hour FROM UNNEST(GENERATE_ARRAY(17, 21)) hour
), night as (
  SELECT hour FROM UNNEST(GENERATE_ARRAY(22, 23)) hour
), hour_to_time_of_day as (
  select hour, 'morning' as time_of_day from morning
    union all select hour, 'evening' as time_of_day from evening
    union all select hour, 'night' as time_of_day from night 
)
select *
from hour_to_time_of_day td
  inner join {{ ref('current_time') }} as ct on td.hour = ct.hour;