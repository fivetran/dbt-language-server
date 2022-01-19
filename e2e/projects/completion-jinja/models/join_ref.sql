{{
  config(
    schema='dbt_ls_e2e_dataset',
    materialized='table'
  ) 
}}

select u.id from {{ ref('users') }} u
inner join {{ ref('test_table1') }} t1 on u.name = t1.name