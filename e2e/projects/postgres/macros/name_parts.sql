{% macro extract_first_name(column_name) %}
    {{ 'SPLIT_PART(' + column_name + ' , \' \'' + ', 1)' }}
{% endmacro %}

{% macro extract_last_name(column_name) %}
    {{ 'SPLIT_PART(' + column_name + ' , \' \'' + ', 2)' }}
{% endmacro %}