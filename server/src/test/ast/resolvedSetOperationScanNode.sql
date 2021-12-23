with gsheet_emails as (
  select 
    ae_owner as email,
    'territory_roster' as sheet
  from `project-abcde-400`.g_sheets.territory_roster
  where ae_owner is not null
  union all
  select
    bdr_owner as email,
    'territory_roster' as sheet
  from `project-abcde-400`.g_sheets.territory_roster
  where bdr_owner is not null
  union all
  select
    am_owner as email,
    'territory_roster' as sheet
  from `project-abcde-400`.g_sheets.territory_roster
  where am_owner is not null
  union all
  select
    se_owner as email,
    'territory_roster' as sheet
  from `project-abcde-400`.g_sheets.territory_roster
  where se_owner is not null
  union all
  select
    owner_email as email,
    'sales_quotas_and_thresholds' as sheet
  from `project-abcde-400`.g_sheets.sales_quotas_and_thresholds
  where team_role != 'N/A'
  union all
  select
    owner_email as email,
    'sales_manager_quotas' as sheet
  from `project-abcde-400`.g_sheets.sales_manager_quotas
  where owner_email != 'user@fivetran.com'
)
select
  gsheet_emails.email,
  string_agg(distinct gsheet_emails.sheet) as sheets_with_email
from gsheet_emails
left join `project-abcde-400`.salesforce.user on gsheet_emails.email = user.email
group by 1 having count(distinct user.id) > 1