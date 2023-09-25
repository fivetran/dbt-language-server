WITH cte1 AS (SELECT 1 AS a),
     cte2 AS (SELECT 1 AS a),
     cte3 AS (SELECT 1 AS a)

SELECT * 
FROM cte1 c1
JOIN cte2 c2
JOIN cte3 c3
ON c2.a = c3.a
ON c1.a = c3.a
