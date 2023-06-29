SELECT 
    OBJECT_DELETE(OBJECT_CONSTRUCT('a', 1, 'b', 2, 'c', 3), 'a', 'b'),
    OBJECT_DELETE(OBJECT_CONSTRUCT('a', 1, 'b', 2, 'c', 3), 'a'),
