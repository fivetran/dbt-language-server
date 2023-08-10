-- TODO: add test
select * from 
{{ dbt_utils.union_relations(
          relations=[ref('join_tables'), ref('join_tables')]
   ) 
}}