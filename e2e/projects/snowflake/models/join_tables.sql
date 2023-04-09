select * from {{ ref('test_table1') }} as tt
inner join lateral (select * from {{ ref('users') }} as u);
