with users_table as (
    select email, id as user_id, 2 as two from {{ source('new_project', 'users') }}
), test_table as (
    select 1 as one,
    2 as two, u1.division as dv
    from {{ source('new_project', 'users') }} as u1
), query_from_other_with as (
  select
    tt.one,
    tt.dv,
    dv,
    tt.two,
    ut.two,
    ut.email,
    email as email2
  from test_table as tt
  inner join users_table ut on tt.one = ut.user_id
), id_source as (
  select 1 as id
), star as (
  select 
    1 as star_test1,
    id as star_id
  from id_source
), gr_table as (
  select 
    email as grouping_email, count(*) as groupint_count
  from users_table
  group by 1
), group_external as (
  select
    id,
    min(id)
  from {{ ref('table_exists') }} 
  group by 1
)
select
    star.*,
    email, one,
    id,
    t.id,
    test_table.two,
    test_table.dv,
    dv,
    ct2.now,
    ct1.hour,
    star.star_test1,
    another_alias.star_test1,
    grouping_email
from test_table
inner join users_table on users_table.user_id = test_table.one
inner join {{ ref('table_exists') }} as t on t.id = test_table.one
cross join {{ ref('current_time_of_day') }} as ct1
cross join {{ ref('current_time_of_day') }} as ct2
inner join star on star.star_test1 = test_table.one
inner join star as another_alias on another_alias.star_test1 = test_table.one
inner join gr_table on grouping_email = email
