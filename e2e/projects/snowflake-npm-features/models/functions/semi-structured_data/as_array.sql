WITH test_data AS (
    SELECT 1 AS id, PARSE_JSON('[1,2,3]') AS variant_data,
           PARSE_JSON('{"key":"value"}') AS variant_data2
)
SELECT 
    id,
    AS_ARRAY(variant_data) AS array_data,
    AS_ARRAY(variant_data2) AS array_data2
FROM test_data;
