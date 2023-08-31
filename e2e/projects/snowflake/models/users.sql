{{
  config(
    schema='dbt_ls_e2e_dataset',
    materialized='table'
  )
}}

select
  1 as "a",
  2 as "B",
  3 as c,
  'str' as "test string"
