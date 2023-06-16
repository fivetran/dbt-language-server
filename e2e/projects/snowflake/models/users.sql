{{
  config(
    schema='dbt_ls_e2e_dataset',
    materialized='table'
  )
}}

select * from dbt_ls_e2e_dataset.users