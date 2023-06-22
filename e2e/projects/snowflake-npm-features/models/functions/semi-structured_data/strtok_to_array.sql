SELECT
    STRTOK_TO_ARRAY('apple,banana,orange', ',') AS fruits,
    STRTOK_TO_ARRAY('dog;cat;bird', ';') AS animals,
    STRTOK_TO_ARRAY('1-2-3-4-5', '-') AS numbers,
    STRTOK_TO_ARRAY('1 2 3 4 5'),
    STRTOK_TO_ARRAY(to_variant('1 2 3 4 5')),
    STRTOK_TO_ARRAY(to_variant('1 2 3 4 5'), to_variant(' ')),
    STRTOK_TO_ARRAY('1-2-3-4-5', to_variant('-'))
