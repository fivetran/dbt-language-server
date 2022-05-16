select
    u.id,
    
    SPLIT(u.name, ' ')[SAFE_OFFSET(0)]
,
    
    SPLIT(u.name, ' ')[SAFE_OFFSET(1)]

from `singular-vector-135519`.`dbt_ls_e2e_dataset`.`users` u
inner join `singular-vector-135519`.`dbt_ls_e2e_dataset`.`table_exists` as s on u.id = s.id;