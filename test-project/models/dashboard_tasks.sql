{{
  config(
    schema='transforms',
    materialized='table'
  )
}}

with tasks_raw as (
  select
    id as task_id,
    group_id,
    integration_type_key,
    -- type as type, -- included in integration_type_key as machine-readable version (replaces space with plus)
    _fivetran_synced,
    _fivetran_deleted,
    deleted_at,
    created_at,
    row_number() over (partition by {{ dbt_utils.surrogate_key(['group_id', 'instance', 'created_at']) }} order by _fivetran_synced desc) as task_num
  from pg_public.tasks
), tasks_cleaned as (
  select
    *
  from tasks_raw
  where task_num = 1
), tasks_modeled as (
  select
    * except (integration_type_key, _fivetran_synced, _fivetran_deleted),
    (_fivetran_deleted or (deleted_at is not null)) as completed,
    case when _fivetran_deleted then _fivetran_synced
      when deleted_at is not null then deleted_at
    end as completed_at,
    case when _fivetran_deleted then timestamp_diff(_fivetran_synced, created_at, second) 
      when deleted_at is not null then timestamp_diff(deleted_at, created_at, second) 
    end as s_to_completion,
    split(integration_type_key, '/')[safe_offset(0)] as integration_schema_name,
    split(integration_type_key, '/')[safe_offset(1)] as task_type
  from tasks_cleaned
), add_services as (
  select
    tasks_modeled.*,
    z_dt_connectors.service,
    z_dt_connectors.paused,
    z_dt_connectors.sf_account_id,
    accounts.account_segment,
    z_dt_connectors.warehouse_exact_type as destination_service,
    z_dt_connectors.warehouse_subtype as destination_subtype
  from tasks_modeled
  left join transforms.z_dt_connectors on tasks_modeled.integration_schema_name = z_dt_connectors.integration_schema_name
    and tasks_modeled.group_id = z_dt_connectors.group_id
  left join transforms_bi.accounts on z_dt_connectors.sf_account_id = accounts.id
)

select
  coalesce(cast(task_id as string), {{ dbt_utils.surrogate_key(['group_id', 'sf_account_id', 'integration_schema_name', 'created_at']) }}) as task_id,
  * except(task_id, task_num), 
  s_to_completion < 21600 as completed_under_6h
from add_services