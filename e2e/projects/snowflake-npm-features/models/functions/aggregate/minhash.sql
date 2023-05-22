WITH data AS (
    SELECT 'Alice' as user, 1 as event_id
    UNION ALL
    SELECT 'Bob', 2
    UNION ALL
    SELECT 'Charlie', 3
    UNION ALL
    SELECT 'Alice', 4
    UNION ALL
    SELECT 'Bob', 5
)
SELECT MINHASH(5, user) FROM data;
