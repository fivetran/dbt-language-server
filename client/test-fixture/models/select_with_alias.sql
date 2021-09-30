select * from dbt_ls_e2e_dataset.test_table1 t
left join dbt_ls_e2e_dataset.user on t.name=user.name
