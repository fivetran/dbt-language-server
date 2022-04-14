with recursive referrers as (
    select id as user_id, referrer_id
    from {{ source('new_project', 'users') }}

    union all

    select rf1.user_id as user_id, rf2.referrer_id as referrer_id
    from referrers rf1
        inner join referrers rf2 on rf1.referrer_id = rf2.user_id
    where not exists (select * from referrers where user_id = rf1.user_id and referrer_id = rf2.referrer_id)
)

select *
from referrers