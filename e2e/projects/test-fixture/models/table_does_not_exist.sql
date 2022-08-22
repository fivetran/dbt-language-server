{{
  config(
    schema='dbt_ls_e2e_dataset',
    materialized='table'
  ) 
}}
select 1 as id, 2 as new_date;
