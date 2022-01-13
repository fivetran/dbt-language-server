select * from dbt_ls_e2e_dataset.users u
inner join {{ ref('table_exists') }} as s on u.id = s.id;