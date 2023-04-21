WITH sample_data AS (
  SELECT 'The quick brown fox jumps over the lazy dog' AS sentence
)
SELECT REGEXP_REPLACE(sentence, 'fox', 'cat') AS replaced_sentence
FROM sample_data;
