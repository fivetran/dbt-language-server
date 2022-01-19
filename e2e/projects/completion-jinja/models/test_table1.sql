{{
  config(
    schema='dbt_ls_e2e_dataset',
    materialized='table'
  ) 
}}

select * from `singular-vector-135519`.dbt_ls_e2e_dataset.test_table1