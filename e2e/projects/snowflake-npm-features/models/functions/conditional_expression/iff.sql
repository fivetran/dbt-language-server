WITH test_data AS (
    SELECT 1 AS id, 'A' AS value, 10 AS num UNION ALL
    SELECT 2, 'B', 20 UNION ALL
    SELECT 3, 'C', 30 UNION ALL
    SELECT 4, 'D', 40
)

SELECT 
    id,
    value,
    num,
    IFF(value = 'A', 'First', 'Not First') AS iff_simple,
    IFF(num > 20, 'Greater than 20', 'Less than 20') AS iff_extended,
    IFF(false, true, false),
    IFF(true, true, false),
    IFF(false, true, 'false'),
    IFF(true, 'true', false)
FROM test_data;
