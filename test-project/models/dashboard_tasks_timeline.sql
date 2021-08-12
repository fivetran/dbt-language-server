{{
  config(
    schema='transforms',
    materialized='table'
  )
}}

with unnest_to_timeline as (
  select 
    *,
    case 
        when timeline_date < date(completed_at) then true 
        when completed_at is null then true else false end as is_unresolved_eod
  from {{ref('dashboard_tasks')}}, unnest(generate_date_array(date(created_at), coalesce(date(completed_at), current_date()))) as timeline_date
)

select
  timeline_date,
  sf_account_id,
  group_id,
  service,
  integration_schema_name,
  sum(if(is_unresolved_eod, 1, 0)) as num_unresolved_tasks,
  sum(
    case 
      when is_unresolved_eod 
        and date(created_at) between date_sub(timeline_date, interval 30 day) and timeline_date
          then 1
      else 
        0 end
  ) as num_unresolved_tasks_created_within_30_days
from unnest_to_timeline
{{dbt_utils.group_by(n=5)}}