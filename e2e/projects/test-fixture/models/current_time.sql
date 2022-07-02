{{
  config(
    schema='dbt_ls_e2e_dataset',
    materialized='table'
  ) 
}}
SELECT EXTRACT(HOUR FROM CURRENT_TIME()) as hour, CURRENT_TIME() as now;