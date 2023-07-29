select 
    timediff(month, '2021-01-01', '2021-02-28'),
    timediff(mm, '2021-01-01', '2021-02-28'),
    timediff(mon, '2021-01-01', '2021-02-28'),
    timediff(mons, '2021-01-01', '2021-02-28'),
    timediff(months, '2021-01-01', '2021-02-28'),

    timediff(day, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timediff(d, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timediff(dd, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timediff(days, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timediff(dayofmonth, '2021-01-01'::DATE, '2021-02-28'::DATE),

    timediff(week, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timediff(w, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timediff(wk, '2021-01-01'::DATE, '2021-02-28'::DATE),

    timediff(quarter, '2021-01-01'::DATE, '2021-02-28'::DATE),
    
    timediff(year, '2021-01-01'::DATE, '2021-02-28'::DATE),
    timediff(years, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timediff(y, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timediff(yy, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timediff(yyy, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timediff(yyyy, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timediff(yr, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timediff(yrs, '2020-01-01'::DATE, '2021-02-28'::DATE),

    timediff(quarter, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timediff(q, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timediff(qtr, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timediff(qtrs, '2020-01-01'::DATE, '2021-02-28'::DATE),
    timediff(quarters, '2020-01-01'::DATE, '2021-02-28'::DATE),

    timediff(hour, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timediff(h, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timediff(hh, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timediff(hr, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timediff(hours, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timediff(hrs, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),

    timediff(minute, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),
    timediff(second, '2021-01-01 00:00:00'::TIMESTAMP, '2023-07-24 14:30:00'::TIMESTAMP),

    timediff(yrs, '2021-01-01 00:00:00'::TIMESTAMP, '2021-02-28'::DATE),
    timediff(yrs, '2021-01-01 00:00:00'::DATE, '2021-01-01 00:00:00'::TIMESTAMP),
    timediff(yrs, '2021-01-01 00:00:00'::DATE, '2021-01-01'),
    timediff(yrs, '2021-01-01 00:00:00'::TIMESTAMP, '2021-01-01 00:00:00')

