{% set relations = dbt_utils.get_relations_by_pattern('dbt_ls_e2e_dataset%', '%') %}

{% for relation in relations %}
    {{ relation }}
{% endfor %}



{% set column_names = dbt_utils.get_filtered_columns_in_relation(from=ref('table_exists'), except=[]) %}

{% for column_name in column_names %}
    'Column name: ' {{ column_name }}
{% endfor %}


{% set column_values = dbt_utils.get_column_values(table=ref('users'), column='division') %}

{% for column_value in column_values %}
    'Column value:' {{ column_value }}
{% endfor %}
