SELECT
    XMLGET(to_variant('<book><title>Sample Book</title><author>John Doe</author></book>'), 'title'),
    XMLGET(to_object(to_variant('<book><title>Sample Book</title><author>John Doe</author></book>')), 'author')
