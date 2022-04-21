

select u.i from `singular-vector-135519`.`dbt_ls_e2e_dataset`.`users` u
inner joidn `singular-vector-135519`.`dbt_ls_e2e_dataset`.`test_table1` t1 on u.name = t1.name