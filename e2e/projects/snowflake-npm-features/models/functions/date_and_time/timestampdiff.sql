select 
    timestampdiff(month, '2021-01-01', '2021-02-28'),
    timestampdiff(mm, '2021-01-01', '2021-02-28'),
    timestampdiff(mon, '2021-01-01', '2021-02-28'),
    timestampdiff(mons, '2021-01-01', '2021-02-28'),
    timestampdiff(months, '2021-01-01', '2021-02-28'),

    timestampdiff(day, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(d, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(dd, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(days, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(dayofmonth, '2021-01-01'::DATE, '2021-02-28'::DATE),

    timestampdiff(week, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(w, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(wk, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(weekofyear, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(woy, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(wy, '2021-01-01'::DATE, '2021-02-28'::DATE),

    timestampdiff(quarter, '2021-01-01'::DATE, '2021-02-28'::DATE),
    
    timestampdiff(year, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(years, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(y, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(yy, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(yyy, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(yyyy, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(yr, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(yrs, '2020-01-01'::DATE, '2021-02-28'::DATE),

    timestampdiff(quarter, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(q, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(qtr, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(qtrs, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timestampdiff(quarters, '2020-01-01'::DATE, '2021-02-28'::DATE),

    timestampdiff(hour, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timestampdiff(h, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timestampdiff(hh, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timestampdiff(hr, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timestampdiff(hours, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timestampdiff(hrs, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),

    timestampdiff(minute, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timestampdiff(second, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),

    timestampdiff(yrs, '2021-01-01 00:00:00'::TIMESTAMP, '2021-02-28'::DATE),
    timestampdiff(yrs, '2021-01-01 00:00:00'::DATE, '2021-01-01 00:00:00'::TIMESTAMP),
    timestampdiff(yrs, '2021-01-01 00:00:00'::DATE, '2021-01-01'),
    timestampdiff(yrs, '2021-01-01 00:00:00'::TIMESTAMP, '2021-01-01 00:00:00'),

