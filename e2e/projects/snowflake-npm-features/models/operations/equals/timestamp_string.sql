with cte as (
    select '2023-07-07 13:00:00'::timestamp as time_variable
    union
    select '2023-07-07 14:00:00' as time_variable
)
select * from cte
where time_variable = '2023-07-07 13:00:00' OR '2023-07-07 13:00:00' = time_variable
