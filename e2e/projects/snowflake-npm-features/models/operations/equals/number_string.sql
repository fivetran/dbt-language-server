with cte as (
    select '100' as variable
    union
    select 200
)
select *, typeof(variable) from cte
where 200 = variable or variable = 100
