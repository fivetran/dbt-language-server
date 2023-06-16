select
  array_construct(1, 2, 3) as num_array,
  array_construct('a', 'b', 'c') as str_array,
  array_construct(null, 'hello', 3.5, 4, 5) mixed_array,
  array_construct(current_timestamp(), current_timestamp()) as timestamp_array
