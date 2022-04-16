{{ config(schema='dbt_ls_e2e_dataset', materialized='table') }}

select id
from {{ ref('users') }}