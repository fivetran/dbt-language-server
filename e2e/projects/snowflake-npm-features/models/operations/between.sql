with cte as (
    select 1 as t
)
select * from cte
where t between 1 and '23'