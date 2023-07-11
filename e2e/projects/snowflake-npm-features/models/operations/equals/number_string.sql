with cte as (
    select '100' as num_variable
    union
    select 200 as num_variable
)
select *, typeof(num_variable) from cte
where 101 = num_variable OR num_variable = 100
