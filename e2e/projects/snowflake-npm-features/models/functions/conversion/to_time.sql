SELECT
    TO_TIME('13:30:00'),
    TO_TIME('14:30:00', 'HH24:MI:SS'),
    TO_TIME('2023-06-19 14:30:00', 'YYYY-MM-DD HH24:MI:SS'),
    TO_TIME('31536001'),
    TO_TIME(TO_VARIANT('13:30:00'))