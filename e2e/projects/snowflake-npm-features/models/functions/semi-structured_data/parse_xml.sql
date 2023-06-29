WITH sample_data AS (
    SELECT '<root><element1>value1</element1><element2>value2</element2></root>' AS xml_string
)

SELECT 
    PARSE_XML(xml_string),
    PARSE_XML(to_variant(xml_string)),
    PARSE_XML(xml_string, true),
    PARSE_XML(xml_string, false),
    PARSE_XML(to_variant(xml_string), true)
FROM
    sample_data;
