-- TODO: add test
select * from 
{{ dbt_utils.union_relations(relations=[
      ref('users'),
      ref('users')
   ]) 
}}
