with a as (select 5 as x),
b as (select 10 as y)
select * from a
where x < all (select y from b)
