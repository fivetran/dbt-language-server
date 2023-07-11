with cte as (
    select current_date() as date_variable
    union
    select '2023-07-08' as date_variable
)
select * from cte
where date_variable = '2023-07-07' OR '2023-07-07' = date_variable
