SELECT TO_TIMESTAMP('2023-04-20 12:34:56 -05:00', 'YYYY-MM-DD HH24:MI:SS TZHTZM'),
    TO_TIMESTAMP_TZ('2013-04-05 01:02:03'),
    TO_TIMESTAMP_NTZ(40 * 365.25 * 86400);