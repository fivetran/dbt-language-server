

select
  concat(integratifons.owner, '-', integrations.schema_name, '-', current_date()) as primary_key,
  current_date() as date,
  integrations.owner as group_id,
  integrations.schema_name as integration_schema_name,
  integrations.signed_up as integration_signed_up,
  integrations.connecting_user as sign_up_user_id,
  integrations.service,
  integrations.service_version,
  integrations.paused,
  integrations.status as integration_status,
  integrations.setup_status as integration_setup_status,
  integrations.use_gcp,
  redshift.service as warehouse_exact_type,
  case
    when redshift.service like '%big_query%' then 'bigquery'
    when redshift.service like '%postgres%' then 'postgres'
    when redshift.service like '%sql_server%' then 'sqlserver'
    when redshift.service like '%mysql%' then 'mysql'
    else replace(redshift.service, '_warehouse', '')
  end as warehouse_subtype,
  lower(integrations.standard_config) like '%syncmode\":\"history%' as history_mode_one_or_more_tables,
  lower(integrations.standard_config) like '%syncmode\":\"legacy%' as legacy_mode_one_or_more_tables,
  integrations.custom_update_period_m,
  -- integrations.standard_config
  integrations.standard_config,
  -- integrations.state
  integrations.state
from `project-name-100`.pg_public.integrations
  left join `project-name-100`.pg_public.redshift
    on integrations.owner = redshift.group
where not integrations._fivetran_deleted


  -- dbt generates an SQL script
  and current_date() >= date(_dbt_max_partition)
