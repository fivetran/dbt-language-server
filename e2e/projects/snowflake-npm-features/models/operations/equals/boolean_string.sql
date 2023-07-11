with cte as (
    select true as bool_variable
    union
    select 'false' as bool_variable
)
select *, typeof(bool_variable) from cte
where bool_variable = 'true' OR 'false' = bool_variable
