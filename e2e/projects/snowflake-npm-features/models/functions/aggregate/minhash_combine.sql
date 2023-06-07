WITH source_data AS (
    SELECT 'John' AS name, 'Doe' AS surname, 'USA' AS country UNION ALL
    SELECT 'Jane' AS name, 'Doe' AS surname, 'USA' AS country UNION ALL
    SELECT 'Bob' AS name, 'Smith' AS surname, 'UK' AS country UNION ALL
    SELECT 'Alice' AS name, 'Johnson' AS surname, 'Canada' AS country
)

SELECT country, OBJECT_AGG(name, TO_VARIANT(surname)) AS names
FROM source_data
GROUP BY country;
