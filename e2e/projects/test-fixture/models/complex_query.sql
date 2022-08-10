with recursive referrers as (
    select id as user_id, referrer_id
    from `singular-vector-135519.dbt_ls_e2e_dataset.users`
    where referrer_id is not null

    union all

    select u.id as used_id, rf.referrer_id as referrer_id
    from `singular-vector-135519.dbt_ls_e2e_dataset.users` u
        inner join referrers rf on u.referrer_id = rf.user_id
), test as (
    WITH Produce AS
    (SELECT 'kale' as item, 23 as purchases, 'vegetable' as category)

    SELECT
        item,
        rank() OVER (PARTITION BY category ORDER BY purchases DESC) as rank
    FROM Produce
        qualify rank <= 3
)

select 
    r.user_id,
    row_number() over (partition by d) as row_n
from referrers r
inner join `singular-vector-135519`.dbt_ls_e2e_dataset.student_details d on d.id = r.user_id
inner join `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT j on j.project_number = r.user_id
where 
    info[OFFSET(1)].subjects.subj2 = 'math' and
    d._PARTITIONTIME = '2022-01-01' and
    current_date() >= date(_dbt_max_partition)
qualify row_n <= 3