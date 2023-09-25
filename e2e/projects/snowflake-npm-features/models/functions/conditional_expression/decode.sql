WITH test_data AS (
    SELECT 1 AS id, 'A' AS value UNION ALL
    SELECT 2, 'B' UNION ALL
    SELECT 3, 'C' UNION ALL
    SELECT 4, 'D'
)

SELECT 
    id,
    value,
    DECODE(value, 'A', 'First', 'B', 'Second', 'Unknown') AS decode_simple,
    DECODE(value, 'A', 'First', 'B', 'Second', 'C', 'Third', 'Unknown') AS decode_extended,
    DECODE(value, 'A', 'First', 'B', 'Second', 'C', 'Third', 'D', 'Fourth', 'Unknown') AS decode_full
FROM test_data;
