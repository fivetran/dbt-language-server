select u.id, {{ extract_first_name('u.full_name') }} as first_name, {{ extract_last_name('u.full_name') }} as last_name, count(*)
from {{ ref('dbt_postgres_test', 'active_users') }} u
    join orders o on u.id = o.user_id
group by u.id, u.full_name