WITH sample_data AS (
  SELECT 'The quick brown fox jumps over the lazy dog' AS sentence
)
SELECT REGEXP_INSTR(sentence, 'fox') AS fox_index
FROM sample_data;
