select * from dbt_ls_e2e_dataset.test_table1
left join dbt_ls_e2e_dataset.user on test_table1.name=user.name
