{{
  config(
    schema='product',
    materialized='incremental',
    incremental_strategy = 'merge',
    unique_key='primary_key'
  )
}}

select
  concat(id, '-', current_date()) as primary_key,
  current_date() as date,
  id as transformation_id,
  created_at,
  created_by,
  group_id,
  name,
  paused,
  trigger,
  last_started_at,
  status
{% if is_incremental() %}
from `d-a-400`.pg_public.transformations

{% if is_incremental() %}
    where not _fivetran_deleted
{% endif %}
