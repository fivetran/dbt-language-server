WITH cte1 AS (SELECT 1 AS a),
     cte2 AS (SELECT 1 AS a),
     cte3 AS (SELECT 1 AS a),
     cte4 AS (SELECT 1 AS a)

SELECT * 
FROM cte1 c1, cte2 c2
JOIN cte3 c3
JOIN cte4 c4
ON c3.a = c4.a
ON c2.a = c4.a
