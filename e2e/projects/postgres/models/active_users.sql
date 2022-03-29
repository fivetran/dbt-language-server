select *
from {{ source('users_orders', 'users') }} u
where exists (select * from {{ source('users_orders', 'orders') }} o where o.user_id = u.id)