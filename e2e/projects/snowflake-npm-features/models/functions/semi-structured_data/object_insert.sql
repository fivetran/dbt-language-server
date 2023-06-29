select 
    OBJECT_INSERT(OBJECT_CONSTRUCT('a',1,'b',2), 'c', 3),
    OBJECT_INSERT(OBJECT_CONSTRUCT('a',1,'b',2), 'c', 'string'),
    OBJECT_INSERT(OBJECT_CONSTRUCT('a',1,'b',2), 'c', 3, true),
    OBJECT_INSERT(OBJECT_CONSTRUCT('a',1,'b',2), 'c', 3, false),
    OBJECT_INSERT(OBJECT_INSERT(OBJECT_CONSTRUCT(),'k1', 100),'k1','string-value', TRUE),