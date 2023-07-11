with cte as (
    select '13:00:00'::time as time_variable
    union
    select '14:00:00' as time_variable
)
select * from cte
where time_variable = '13:00:00' OR '13:00:00' = time_variable
