SELECT * 
FROM VALUES 
    (11, 'a'), 
    (22, 'b')
AS t (col1, col2)

union

SELECT col1, col2
FROM VALUES
    (1, 'John', 'Doe'),
    (2, 'Jane', 'Smith'),
    (3, 'Bob', 'Johnson')
AS mytable(col1, col2);
