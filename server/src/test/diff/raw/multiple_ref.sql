{{
  config(
    schema='transforms',
    materialized='table'
  )
}}

select 
  opportunities_level_0_source.opportunity_id as id,
  opportunities_level_0_source.* except(opportunity_id),
  opportunities_level_1_quote_line_item_aggregation.* except(opportunity_id),
  opportunities_level_1_bookings.* except(opportunity_id),
  opportunities_level_1_stage_dates.* except(opportunity_id),
  opportunities_level_1_stage_dates_technical.* except(opportunity_id),
  case 
    when opportunities_level_1_stage_dates_technical.technical_stage_0_date > opportunities_level_1_stage_dates.stage_4_date then 5
    when opportunities_level_1_stage_dates_technical.technical_stage_0_date > opportunities_level_1_stage_dates.stage_3_date then 4
    when opportunities_level_1_stage_dates_technical.technical_stage_0_date > opportunities_level_1_stage_dates.stage_2_date then 3
    when opportunities_level_1_stage_dates_technical.technical_stage_0_date > opportunities_level_1_stage_dates.stage_1_date then 2
    when opportunities_level_1_stage_dates_technical.technical_stage_0_date > opportunities_level_1_stage_dates.stage_0_date then 1
    when opportunities_level_1_stage_dates_technical.technical_stage_0_date > opportunities_level_1_stage_dates.stage_neg1_date then 0
    else null 
  end as stage_when_se_assigned,
  timestamp_diff(opportunities_level_1_stage_dates_technical.f1_adoption_date, if(opportunities_level_0_source.is_won, opportunities_level_0_source.close_date, null), day) as days_closed_to_f1_adoption,
  opportunities_level_1_activity.* except(opportunity_id)
from {{ref('opportunities_level_0_source')}}
left join {{ref('opportunities_level_1_quote_line_item_aggregation')}} using(opportunity_id)
left join {{ref('opportunities_level_1_bookings')}} using(opportunity_id)
left join {{ref('opportunities_level_1_stage_dates')}} using(opportunity_id)
left join {{ref('opportunities_level_1_stage_dates_technical')}} using(opportunity_id)
left join {{ref('opportunities_level_1_activity')}} using(opportunity_id)


{% if is_incremental() %}
  -- dbt generates an SQL script
  and current_date() >= date(_dbt_max_partition)
{% endif %}