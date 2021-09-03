

with live_analytics_query as (
  select
    account_id,
    date,
    status,
    platform_tier,
    paid_volume,
    credits_used
  from `digital-arbor-400`.`transforms`.`daily_credit_usage`
), static_engineering_table as (
  select
    account_id,
    date(measured_date_utc) as date,
    array_agg(account_status order by account_status)[safe_offset(0)] as status,
    array_agg(platform_tier order by account_status)[safe_offset(0)] as platform_tier,
    sum(paid_rows) as paid_volume,
    sum(credits) as credits_used
  from pg_public.daily_credit_usages
  where not _fivetran_deleted
    and (
      coalesce(adjustment_number, 0) = 0
        or adjustment_type = 'AUTOMATIC'
    )
  group by 1, 2
    /* analytics does not have the adjustments, so we are just checking if our pre-adjustment number checks out against engineering */
), joined as (
  select
    account_id,
    date,
    eng.status as eng_status,
    anl.status as anl_status,
    eng.platform_tier as eng_platform_tier,
    anl.platform_tier as anl_platform_tier,
    eng.paid_volume as eng_paid_volume,
    anl.paid_volume as anl_paid_volume,
    eng.credits_used as eng_credits_used,
    anl.credits_used as anl_credits_used,
  from live_analytics_query as anl
  full join static_engineering_table as eng
    using (account_id, date)
)
select
  *
from joined
where (
  coalesce(eng_credits_used, 0) <> coalesce(anl_credits_used, 0)
    or coalesce(eng_paid_volume, 0) <> coalesce(anl_paid_volume, 0)
) and date < date_sub(current_date(), interval 1 day)
  and account_id not in (
    select
      id
    from `digital-arbor-400`.`transforms`.`operational_testing_fivetran_accounts`
  )
order by account_id, date