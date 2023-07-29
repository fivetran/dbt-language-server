with cte as (
    select current_timestamp as val
    union
    select current_date as val
)
select * from cte
where val = '2023-01-01' OR '2023-01-01 15:30:00' = val
