select * from dbt_ls_e2e_dataset.test_table1
left join dbt_ls_e2e_dataset.users on test_table1.name=users.name
