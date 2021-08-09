{{
  config(
    schema='a_validation',
    materialized='table'
  )
}}

select 
  measured,
  group_id,
  schema_name,
  integration,
  table_name,
  incremental_rows
from {{ref('table_volume_filled')}}
where coalesce(incremental_rows, 0) < 0
order by measured desc