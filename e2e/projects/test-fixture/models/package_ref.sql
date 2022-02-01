select
    u.id,
    {{ extract_first_name('u.name') }},
    {{ extract_last_name('u.name') }}
from dbt_ls_e2e_dataset.users u
inner join {{ ref('my_new_project', 'table_exists') }} as s on u.id = s.id;