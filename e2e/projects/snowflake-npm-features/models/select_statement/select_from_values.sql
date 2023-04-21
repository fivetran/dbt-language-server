SELECT column1, column2, column3
FROM VALUES
  (1, 'John', 'Doe'),
  (2, 'Jane', 'Smith'),
  (3, 'Bob', 'Johnson')
  AS mytable(column1, column2, column3);
