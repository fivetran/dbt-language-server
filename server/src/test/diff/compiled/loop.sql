


    
select
  *
from (
  select 
  'validation_level_1' as validation_name,
  (select count(*) from `a_validation`.`validation_level_1_a`) as count

  union all

  select 
  'validation_level_2' as validation_name,
  (select count(*) from `a_validation`.`validation_level_2_a`) as count

  union all

  select 
  'validation_level_3' as validation_name,
  (select count(*) from `a_validation`.`validation_level_3_a`) as count

  

  
)
order by count desc