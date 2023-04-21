WITH grades AS (
    SELECT 85 AS score
    UNION ALL
    SELECT 90
    UNION ALL
    SELECT 78
    UNION ALL
    SELECT 92
    UNION ALL
    SELECT 88
)
SELECT AVG(score) AS average_score FROM grades;
