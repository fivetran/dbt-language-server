select * from dbt_ls_e2e_dataset.test_table1 t
left join dbt_ls_e2e_dataset.users on t.name=users.name