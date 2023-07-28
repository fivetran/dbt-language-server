-- Using UNION to create a temporary data source
SELECT 
    latitude1, 
    longitude1,
    latitude2,
    longitude2,
    HAVERSINE(latitude1, longitude1, latitude2, longitude2) AS haversine_distance,
    HAVERSINE(latitude1::FLOAT, longitude1::FLOAT, latitude2::FLOAT, longitude2::FLOAT) AS float_haversine_distance,
    HAVERSINE(latitude1::DOUBLE, longitude1::DOUBLE, latitude2::DOUBLE, longitude2::DOUBLE) AS double_haversine_distance,
    HAVERSINE(latitude1::NUMBER, longitude1::NUMBER, latitude2::NUMBER, longitude2::NUMBER) AS number_haversine_distance
FROM 
    (
        SELECT 37.7749 AS latitude1, -122.4194 AS longitude1, 34.0522 AS latitude2, -118.2437 AS longitude2 -- San Francisco to Los Angeles
        UNION ALL
        SELECT 51.5074 AS latitude1, -0.1278 AS longitude1, 40.7128 AS latitude2, -74.0060 AS longitude2 -- London to New York
        UNION ALL
        SELECT 28.7041 AS latitude1, 77.1025 AS longitude1, 35.6895 AS latitude2, 139.6917 AS longitude2 -- Delhi to Tokyo
    ) t;
