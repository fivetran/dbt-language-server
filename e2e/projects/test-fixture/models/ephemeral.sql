{{ config(materialized='ephemeral') }}
select * from dbt_ls_e2e_dataset.test_table1