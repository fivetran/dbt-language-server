{{
  config(
    schema='a_validations_meta',
    materialized='view'
  )
}}

{% if execute -%}
    {% set results = run_query( 'select distinct table_name from `a_validation`.`INFORMATION_SCHEMA`.`TABLES`' ) %}
    {% set results_list = results.columns[0].values() %}
{% endif -%}

select
  *
from (
  {% for view_i in results_list -%}
  select 
  {{ "'" ~ view_i ~ "'" }} as validation_name,
  (select count(*) from `a_validation`.{{ "`" ~ view_i ~ "`"}}) as count

  {% if not loop.last %}union all{% endif %}

  {% endfor %}
)
order by count desc