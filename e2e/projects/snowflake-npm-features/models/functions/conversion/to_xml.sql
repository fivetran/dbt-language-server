SELECT
    TO_XML(OBJECT_CONSTRUCT('a', 1)),
    TO_XML(ARRAY_CONSTRUCT('a', 1)),
    TO_XML(1),
    TO_XML(1.1),
    TO_XML(false)
