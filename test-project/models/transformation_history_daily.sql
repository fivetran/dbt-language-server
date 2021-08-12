{{
  config(
    schema='product',
    materialized='incremental',
    incremental_strategy = 'merge',
    unique_key='primary_key'
  )
}}

select
  concat(t.id, '-', current_date()) as primary_key,
  current_date() as date,
  t.id as transformation_id, 
  created_at,
  created_by_id,
  group_id,
  name,
  paused,
  trigger, last_started_at,
  status,
  test.datetime_col
from {{ var('project_name') }}.pg_public.transformations t
inner join {{ var('project_name') }}.pg_public.test_table test on test.string_col = t.name
where not _fivetran_deleted
