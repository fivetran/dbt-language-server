select new_date
from {{ ref('my_new_project', 'table_does_not_exist') }}
where new_date = date_sub(current_date(), interval 1 day)
