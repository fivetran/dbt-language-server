{% macro extract_first_name(column_name) %}
    {{ 'SPLIT(' + column_name + ', \' \')[SAFE_OFFSET(0)]' }}
{% endmacro %}

{% macro extract_last_name(column_name) %}
    {{ 'SPLIT(' + column_name + ', \' \')[SAFE_OFFSET(1)]' }}
{% endmacro %}
