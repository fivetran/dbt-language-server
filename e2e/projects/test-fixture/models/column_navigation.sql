with users_table as(
    select email, id as user_id from {{ source('new_project', 'users') }}
), test_table as(
    select 1 as one,
    2 as two, u1.division as dv
    from {{ source('new_project', 'users') }} as u1
)
select
    email, one,
    id,
    t.id,
    test_table.two,
    test_table.dv,
    dv,
    now,
    current_time_of_day.hour
from test_table
inner join users_table on users_table.user_id = test_table.one
inner join {{ ref('table_exists') }} as t on t.id = test_table.one
cross join {{ ref('current_time_of_day') }} 