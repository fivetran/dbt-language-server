with recursive referrers as (
    select id as user_id, referrer_id
    from `singular-vector-135519.dbt_ls_e2e_dataset.users`
    where referrer_id is not null

    union all

    select u.id as used_id, rf.referrer_id as referrer_id
    from `singular-vector-135519.dbt_ls_e2e_dataset.users` u
        inner join referrers rf on u.referrer_id = rf.user_id
)

select *
from referrers r
inner join `singular-vector-135519`.dbt_ls_e2e_dataset.student_details d on d.id = r.user_id
where info[OFFSET(1)].subjects.subj2 = 'math'
