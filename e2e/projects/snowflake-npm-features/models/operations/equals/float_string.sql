with cte as (
    select 1.23 as float_variable
    union
    select '4.56' as float_variable
)
select *, typeof(float_variable) from cte
where float_variable = '1.23' OR '1.23' = float_variable
