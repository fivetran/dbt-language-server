SELECT
    TIME('13:30:00'),
    TIME('14:30:00', 'HH24:MI:SS'),
    TIME('2023-06-19 14:30:00', 'YYYY-MM-DD HH24:MI:SS'),
    TIME('31536001'),
    TIME(TO_VARIANT('13:30:00')),
    TIME('13:30:00'::time),
    TIME('2023-06-19 14:30:00'::timestamp),
    TIME(1231233::timestamp),
