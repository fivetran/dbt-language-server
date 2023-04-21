WITH colors AS (
    SELECT 'Red' AS color
    UNION ALL
    SELECT 'Green'
    UNION ALL
    SELECT 'Blue'
)
SELECT ARRAY_AGG(color) AS color_array FROM colors;
