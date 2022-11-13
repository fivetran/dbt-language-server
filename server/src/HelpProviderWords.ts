/* eslint-disable sonarjs/no-duplicate-string */
import { FunctionInfo } from './SignatureHelpProvider';

export const HelpProviderWords: FunctionInfo[] = [
  {
    name: 'any_value',
    signatures: [
      {
        signature:
          'ANY_VALUE(\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description:
          'Returns `expression` for some row chosen from the group. Which row is chosen is\nnondeterministic, not random. Returns `NULL` when the input produces no\nrows. Returns `NULL` when `expression` is `NULL` for all rows in the group.',
        parameters: [],
      },
    ],
  },
  {
    name: 'array_agg',
    signatures: [
      {
        signature:
          'ARRAY_AGG(\n  [ DISTINCT ]\n  expression\n  [ { IGNORE | RESPECT } NULLS ]\n  [ HAVING { MAX | MIN } expression2 ]\n  [ ORDER BY key [ { ASC | DESC } ] [, ... ] ]\n  [ LIMIT n ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description: 'Returns an ARRAY of `expression` values.',
        parameters: [],
      },
    ],
  },
  {
    name: 'array_concat_agg',
    signatures: [
      {
        signature:
          'ARRAY_CONCAT_AGG(\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n  [ ORDER BY key [ { ASC | DESC } ] [, ... ] ]\n  [ LIMIT n ]\n)',
        description: 'Concatenates elements from `expression` of type `ARRAY`, returning a single\narray as a result.',
        parameters: [],
      },
    ],
  },
  {
    name: 'avg',
    signatures: [
      {
        signature:
          'AVG(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description: 'Returns the average of non-`NULL` input values, or `NaN` if the input contains a\n`NaN`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'bit_and',
    signatures: [
      {
        signature: 'BIT_AND(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)',
        description: 'Performs a bitwise AND operation on `expression` and returns the result.',
        parameters: [],
      },
    ],
  },
  {
    name: 'bit_or',
    signatures: [
      {
        signature: 'BIT_OR(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)',
        description: 'Performs a bitwise OR operation on `expression` and returns the result.',
        parameters: [],
      },
    ],
  },
  {
    name: 'bit_xor',
    signatures: [
      {
        signature: 'BIT_XOR(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)',
        description: 'Performs a bitwise XOR operation on `expression` and returns the result.',
        parameters: [],
      },
    ],
  },
  {
    name: 'count',
    signatures: [
      { signature: 'COUNT(*)\n[OVER over_clause]', description: 'Returns the number of rows in the input.', parameters: [] },
      {
        signature:
          'COUNT(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description: 'Returns the number of rows with `expression` evaluated to any value other\nthan `NULL`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'countif',
    signatures: [
      {
        signature:
          'COUNTIF(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description:
          'Returns the count of `TRUE` values for `expression`. Returns `0` if there are\nzero input rows, or if `expression` evaluates to `FALSE` or `NULL` for all rows.',
        parameters: [],
      },
    ],
  },
  {
    name: 'logical_and',
    signatures: [
      {
        signature:
          'LOGICAL_AND(\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description:
          'Returns the logical AND of all non-`NULL` expressions. Returns `NULL` if there\nare zero input rows or `expression` evaluates to `NULL` for all rows.',
        parameters: [],
      },
    ],
  },
  {
    name: 'logical_or',
    signatures: [
      {
        signature:
          'LOGICAL_OR(\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description:
          'Returns the logical OR of all non-`NULL` expressions. Returns `NULL` if there\nare zero input rows or `expression` evaluates to `NULL` for all rows.',
        parameters: [],
      },
    ],
  },
  {
    name: 'max',
    signatures: [
      {
        signature:
          'MAX(\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description:
          'Returns the maximum value of non-`NULL` expressions. Returns `NULL` if there\nare zero input rows or `expression` evaluates to `NULL` for all rows.\nReturns `NaN` if the input contains a `NaN`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'min',
    signatures: [
      {
        signature:
          'MIN(\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description:
          'Returns the minimum value of non-`NULL` expressions. Returns `NULL` if there\nare zero input rows or `expression` evaluates to `NULL` for all rows.\nReturns `NaN` if the input contains a `NaN`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'string_agg',
    signatures: [
      {
        signature:
          'STRING_AGG(\n  [ DISTINCT ]\n  expression [, delimiter]\n  [ HAVING { MAX | MIN } expression2 ]\n  [ ORDER BY key [ { ASC | DESC } ] [, ... ] ]\n  [ LIMIT n ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description:
          'Returns a value (either `STRING` or `BYTES`) obtained by concatenating\nnon-`NULL` values. Returns `NULL` if there are zero input rows or `expression`\nevaluates to `NULL` for all rows.',
        parameters: [],
      },
    ],
  },
  {
    name: 'sum',
    signatures: [
      {
        signature:
          'SUM(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description: 'Returns the sum of non-null values.',
        parameters: [],
      },
    ],
  },
  {
    name: 'corr',
    signatures: [
      {
        signature:
          'CORR(\n  X1, X2\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description:
          'Returns the Pearson coefficient\nof correlation of a set of number pairs. For each number pair, the first number\nis the dependent variable and the second number is the independent variable.\nThe return result is between `-1` and `1`. A result of `0` indicates no\ncorrelation.',
        parameters: [],
      },
    ],
  },
  {
    name: 'covar_pop',
    signatures: [
      {
        signature:
          'COVAR_POP(\n  X1, X2\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description:
          'Returns the population covariance of\na set of number pairs. The first number is the dependent variable; the second\nnumber is the independent variable. The return result is between `-Inf` and\n`+Inf`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'covar_samp',
    signatures: [
      {
        signature:
          'COVAR_SAMP(\n  X1, X2\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description:
          'Returns the sample covariance of a\nset of number pairs. The first number is the dependent variable; the second\nnumber is the independent variable. The return result is between `-Inf` and\n`+Inf`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'stddev_pop',
    signatures: [
      {
        signature:
          'STDDEV_POP(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description: 'Returns the population (biased) standard deviation of the values. The return\nresult is between `0` and `+Inf`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'stddev_samp',
    signatures: [
      {
        signature:
          'STDDEV_SAMP(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description: 'Returns the sample (unbiased) standard deviation of the values. The return\nresult is between `0` and `+Inf`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'stddev',
    signatures: [
      {
        signature:
          'STDDEV(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description: 'An alias of STDDEV_SAMP.',
        parameters: [],
      },
    ],
  },
  {
    name: 'var_pop',
    signatures: [
      {
        signature:
          'VAR_POP(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description: 'Returns the population (biased) variance of the values. The return result is\nbetween `0` and `+Inf`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'var_samp',
    signatures: [
      {
        signature:
          'VAR_SAMP(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description: 'Returns the sample (unbiased) variance of the values. The return result is\nbetween `0` and `+Inf`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'variance',
    signatures: [
      {
        signature:
          'VARIANCE(\n  [ DISTINCT ]\n  expression\n  [ HAVING { MAX | MIN } expression2 ]\n)\n[ OVER over_clause ]\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]\n  [ window_frame_clause ]',
        description: 'An alias of VAR_SAMP.',
        parameters: [],
      },
    ],
  },
  {
    name: 'approx_count_distinct',
    signatures: [
      {
        signature: 'APPROX_COUNT_DISTINCT(\n  expression\n)',
        description:
          'Returns the approximate result for `COUNT(DISTINCT expression)`. The value\nreturned is a statistical estimate, not necessarily the actual value.',
        parameters: ['expression'],
      },
    ],
  },
  {
    name: 'approx_quantiles',
    signatures: [
      {
        signature:
          'APPROX_QUANTILES(\n  [ DISTINCT ]\n  expression, number\n  [ { IGNORE | RESPECT } NULLS ]\n  [ HAVING { MAX | MIN } expression2 ]\n)',
        description:
          'Returns the approximate boundaries for a group of `expression` values, where\n`number` represents the number of quantiles to create. This function returns\nan array of `number` + 1 elements, where the first element is the approximate\nminimum and the last element is the approximate maximum.',
        parameters: [],
      },
    ],
  },
  {
    name: 'approx_top_count',
    signatures: [
      {
        signature: 'APPROX_TOP_COUNT(\n  expression, number\n  [ HAVING { MAX | MIN } expression2 ]\n)',
        description:
          'Returns the approximate top elements of `expression` as an array of `STRUCT`s.\nThe `number` parameter specifies the number of elements returned.',
        parameters: [],
      },
    ],
  },
  {
    name: 'approx_top_sum',
    signatures: [
      {
        signature: 'APPROX_TOP_SUM(\n  expression, weight, number\n  [ HAVING { MAX | MIN } expression2 ]\n)',
        description:
          'Returns the approximate top elements of `expression`, based on the sum of an\nassigned `weight`. The `number` parameter specifies the number of elements\nreturned.',
        parameters: [],
      },
    ],
  },
  {
    name: 'hll_count.init',
    signatures: [
      {
        signature: 'HLL_COUNT.INIT(input [, precision])',
        description:
          'An aggregate function that takes one or more `input` values and aggregates them\ninto a HLL++ sketch. Each sketch\nis represented using the `BYTES` data type. You can then merge sketches using\n`HLL_COUNT.MERGE` or `HLL_COUNT.MERGE_PARTIAL`. If no merging is needed,\nyou can extract the final count of distinct values from the sketch using\n`HLL_COUNT.EXTRACT`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'hll_count.merge',
    signatures: [
      {
        signature: 'HLL_COUNT.MERGE(sketch)',
        description: 'An aggregate function that returns the cardinality of several\nHLL++ set sketches by computing their union.',
        parameters: ['sketch'],
      },
    ],
  },
  {
    name: 'hll_count.merge_partial',
    signatures: [
      {
        signature: 'HLL_COUNT.MERGE_PARTIAL(sketch)',
        description: 'An aggregate function that takes one or more\nHLL++ `sketch`\ninputs and merges them into a new sketch.',
        parameters: ['sketch'],
      },
    ],
  },
  {
    name: 'hll_count.extract',
    signatures: [
      {
        signature: 'HLL_COUNT.EXTRACT(sketch)',
        description: 'A scalar function that extracts a cardinality estimate of a single\nHLL++ sketch.',
        parameters: ['sketch'],
      },
    ],
  },
  {
    name: 'kll_quantiles.init_int64',
    signatures: [
      {
        signature: 'KLL_QUANTILES.INIT_INT64(input[, precision[, weight => input_weight]])',
        description:
          'Takes one or more `input` values and aggregates them into a\nKLL sketch. This function represents the output sketch\nusing the `BYTES` data type. This is an\naggregate function.',
        parameters: [],
      },
    ],
  },
  {
    name: 'kll_quantiles.init_uint64',
    signatures: [
      {
        signature: 'KLL_QUANTILES.INIT_UINT64(input[, precision[, weight => input_weight]])',
        description: 'Like `KLL_QUANTILES.INIT_INT64`,\nbut accepts `input` of type `UINT64`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'kll_quantiles.init_double',
    signatures: [
      {
        signature: 'KLL_QUANTILES.INIT_DOUBLE(input[, precision[, weight => input_weight]])',
        description: 'Like `KLL_QUANTILES.INIT_INT64`,\nbut accepts `input` of type `DOUBLE`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'kll_quantiles.merge_partial',
    signatures: [
      {
        signature: 'KLL_QUANTILES.MERGE_PARTIAL(sketch)',
        description:
          'Takes KLL sketches of the same underlying type and merges them to return a new\nsketch of the same underlying type. This is an aggregate function.',
        parameters: ['sketch'],
      },
    ],
  },
  {
    name: 'kll_quantiles.merge_int64',
    signatures: [
      {
        signature: 'KLL_QUANTILES.MERGE_INT64(sketch, number)',
        description:
          'Takes KLL sketches as `BYTES` and merges them into\na new sketch, then returns the quantiles that divide the input into\n`number` equal-sized groups, along with the minimum and maximum values of the\ninput. The output is an `ARRAY` containing the exact minimum value from\nthe input data that you used to initialize the sketches, each\napproximate quantile, and the exact maximum value from the initial input data.\nThis is an aggregate function.',
        parameters: ['sketch', 'number'],
      },
    ],
  },
  {
    name: 'kll_quantiles.merge_uint64',
    signatures: [
      {
        signature: 'KLL_QUANTILES.MERGE_UINT64(sketch, number)',
        description: 'Like `KLL_QUANTILES.MERGE_INT64`,\nbut accepts KLL sketches initialized on data of type `UINT64`.',
        parameters: ['sketch', 'number'],
      },
    ],
  },
  {
    name: 'kll_quantiles.merge_double',
    signatures: [
      {
        signature: 'KLL_QUANTILES.MERGE_DOUBLE(sketch, number)',
        description: 'Like `KLL_QUANTILES.MERGE_INT64`,\nbut accepts KLL sketches initialized on data of type\n`DOUBLE`.',
        parameters: ['sketch', 'number'],
      },
    ],
  },
  {
    name: 'kll_quantiles.merge_point_int64',
    signatures: [
      {
        signature: 'KLL_QUANTILES.MERGE_POINT_INT64(sketch, phi)',
        description:
          'Takes KLL sketches as `BYTES` and merges them, then extracts a single\nquantile from the merged sketch. The `phi` argument specifies the quantile\nto return as a fraction of the total number of rows in the input, normalized\nbetween 0 and 1. This means that the function will return a value v such that\napproximately Φ * n inputs are less than or equal to v, and a (1-Φ) / n\ninputs are greater than or equal to v. This is an aggregate function.',
        parameters: ['sketch', 'phi'],
      },
    ],
  },
  {
    name: 'kll_quantiles.merge_point_uint64',
    signatures: [
      {
        signature: 'KLL_QUANTILES.MERGE_POINT_UINT64(sketch, phi)',
        description: 'Like `KLL_QUANTILES.MERGE_POINT_INT64`,\nbut accepts KLL sketches initialized on data of type `UINT64`.',
        parameters: ['sketch', 'phi'],
      },
    ],
  },
  {
    name: 'kll_quantiles.merge_point_double',
    signatures: [
      {
        signature: 'KLL_QUANTILES.MERGE_POINT_DOUBLE(sketch, phi)',
        description: 'Like `KLL_QUANTILES.MERGE_POINT_INT64`,\nbut accepts KLL sketches initialized on data of type\n`DOUBLE`.',
        parameters: ['sketch', 'phi'],
      },
    ],
  },
  {
    name: 'kll_quantiles.extract_int64',
    signatures: [
      {
        signature: 'KLL_QUANTILES.EXTRACT_INT64(sketch, number)',
        description:
          'Takes a single KLL sketch as `BYTES` and returns a selected `number` of\nquantiles. The output is an `ARRAY` containing the exact minimum value from\nthe input data that you used to initialize the sketch, each approximate\nquantile, and the exact maximum value from the initial input data. This is a\nscalar function, similar to `KLL_QUANTILES.MERGE_INT64`, but scalar rather than\naggregate.',
        parameters: ['sketch', 'number'],
      },
    ],
  },
  {
    name: 'kll_quantiles.extract_uint64',
    signatures: [
      {
        signature: 'KLL_QUANTILES.EXTRACT_UINT64(sketch, number)',
        description: 'Like `KLL_QUANTILES.EXTRACT_INT64`,\nbut accepts KLL sketches initialized on data of type `UINT64`.',
        parameters: ['sketch', 'number'],
      },
    ],
  },
  {
    name: 'kll_quantiles.extract_double',
    signatures: [
      {
        signature: 'KLL_QUANTILES.EXTRACT_DOUBLE(sketch, number)',
        description: 'Like `KLL_QUANTILES.EXTRACT_INT64`,\nbut accepts KLL sketches initialized on data of type\n`DOUBLE`.',
        parameters: ['sketch', 'number'],
      },
    ],
  },
  {
    name: 'kll_quantiles.extract_point_int64',
    signatures: [
      {
        signature: 'KLL_QUANTILES.EXTRACT_POINT_INT64(sketch, phi)',
        description:
          'Takes a single KLL sketch as `BYTES` and returns a single quantile.\nThe `phi` argument specifies the quantile to return as a fraction of the total\nnumber of rows in the input, normalized between 0 and 1. This means that the\nfunction will return a value v such that approximately Φ * n inputs are less\nthan or equal to v, and a (1-Φ) / n inputs are greater than or equal to v.\nThis is a scalar function.',
        parameters: ['sketch', 'phi'],
      },
    ],
  },
  {
    name: 'kll_quantiles.extract_point_uint64',
    signatures: [
      {
        signature: 'KLL_QUANTILES.EXTRACT_POINT_UINT64(sketch, phi)',
        description: 'Like `KLL_QUANTILES.EXTRACT_POINT_INT64`,\nbut accepts KLL sketches initialized on data of type `UINT64`.',
        parameters: ['sketch', 'phi'],
      },
    ],
  },
  {
    name: 'kll_quantiles.extract_point_double',
    signatures: [
      {
        signature: 'KLL_QUANTILES.EXTRACT_POINT_DOUBLE(sketch, phi)',
        description: 'Like `KLL_QUANTILES.EXTRACT_POINT_INT64`,\nbut accepts KLL sketches initialized on data of type\n`DOUBLE`.',
        parameters: ['sketch', 'phi'],
      },
    ],
  },
  {
    name: 'rank',
    signatures: [
      {
        signature:
          'RANK()\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  ORDER BY expression [ { ASC | DESC }  ] [, ...]',
        description:
          'Returns the ordinal (1-based) rank of each row within the ordered partition.\nAll peer rows receive the same rank value. The next row or set of peer rows\nreceives a rank value which increments by the number of peers with the previous\nrank value, instead of `DENSE_RANK`, which always increments by 1.',
        parameters: [],
      },
    ],
  },
  {
    name: 'dense_rank',
    signatures: [
      {
        signature:
          'DENSE_RANK()\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  ORDER BY expression [ { ASC | DESC }  ] [, ...]',
        description:
          'Returns the ordinal (1-based) rank of each row within the window partition.\nAll peer rows receive the same rank value, and the subsequent rank value is\nincremented by one.',
        parameters: [],
      },
    ],
  },
  {
    name: 'percent_rank',
    signatures: [
      {
        signature:
          'PERCENT_RANK()\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  ORDER BY expression [ { ASC | DESC }  ] [, ...]',
        description:
          'Return the percentile rank of a row defined as (RK-1)/(NR-1), where RK is\nthe `RANK` of the row and NR is the number of rows in the partition.\nReturns 0 if NR=1.',
        parameters: [],
      },
    ],
  },
  {
    name: 'cume_dist',
    signatures: [
      {
        signature:
          'CUME_DIST()\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  ORDER BY expression [ { ASC | DESC }  ] [, ...]',
        description:
          'Return the relative rank of a row defined as NP/NR. NP is defined to be the\nnumber of rows that either precede or are peers with the current row. NR is the\nnumber of rows in the partition.',
        parameters: [],
      },
    ],
  },
  {
    name: 'ntile',
    signatures: [
      {
        signature:
          'NTILE(constant_integer_expression)\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  ORDER BY expression [ { ASC | DESC }  ] [, ...]',
        description:
          'This function divides the rows into `constant_integer_expression`\nbuckets based on row ordering and returns the 1-based bucket number that is\nassigned to each row. The number of rows in the buckets can differ by at most 1.\nThe remainder values (the remainder of number of rows divided by buckets) are\ndistributed one for each bucket, starting with bucket 1. If\n`constant_integer_expression` evaluates to NULL, 0 or negative, an\nerror is provided.',
        parameters: [],
      },
    ],
  },
  {
    name: 'row_number',
    signatures: [
      {
        signature:
          'ROW_NUMBER()\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  [ ORDER BY expression [ { ASC | DESC }  ] [, ...] ]',
        description:
          'Does not require the `ORDER BY` clause. Returns the sequential\nrow ordinal (1-based) of each row for each ordered partition. If the\n`ORDER BY` clause is unspecified then the result is\nnon-deterministic.',
        parameters: [],
      },
    ],
  },
  {
    name: 'bit_count',
    signatures: [
      { signature: 'BIT_COUNT(expression)', description: 'The input, `expression`, must be an\ninteger or BYTES.', parameters: ['expression'] },
    ],
  },
  {
    name: 'abs',
    signatures: [
      {
        signature: 'ABS(X)',
        description:
          'Computes absolute value. Returns an error if the argument is an integer and the\noutput value cannot be represented as the same type; this happens only for the\nlargest negative input value, which has no positive representation.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'sign',
    signatures: [
      {
        signature: 'SIGN(X)',
        description:
          'Returns `-1`, `0`, or `+1` for negative, zero and positive arguments\nrespectively. For floating point arguments, this function does not distinguish\nbetween positive and negative zero.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'is_inf',
    signatures: [{ signature: 'IS_INF(X)', description: 'Returns `TRUE` if the value is positive or negative infinity.', parameters: ['X'] }],
  },
  { name: 'is_nan', signatures: [{ signature: 'IS_NAN(X)', description: 'Returns `TRUE` if the value is a `NaN` value.', parameters: ['X'] }] },
  {
    name: 'ieee_divide',
    signatures: [
      {
        signature: 'IEEE_DIVIDE(X, Y)',
        description:
          'Divides X by Y; this function never fails. Returns\n`DOUBLE` unless\nboth X and Y are `FLOAT`, in which case it returns\n`FLOAT`. Unlike the division operator (/),\nthis function does not generate errors for division by zero or overflow.</p>',
        parameters: ['X', 'Y'],
      },
    ],
  },
  {
    name: 'rand',
    signatures: [
      {
        signature: 'RAND()',
        description: 'Generates a pseudo-random value of type `DOUBLE` in\nthe range of [0, 1), inclusive of 0 and exclusive of 1.',
        parameters: [],
      },
    ],
  },
  {
    name: 'sqrt',
    signatures: [{ signature: 'SQRT(X)', description: 'Computes the square root of X. Generates an error if X is less than 0.', parameters: ['X'] }],
  },
  {
    name: 'pow',
    signatures: [
      {
        signature: 'POW(X, Y)',
        description:
          'Returns the value of X raised to the power of Y. If the result underflows and is\nnot representable, then the function returns a  value of zero.',
        parameters: ['X', 'Y'],
      },
    ],
  },
  { name: 'power', signatures: [{ signature: 'POWER(X, Y)', description: 'Synonym of `POW(X, Y)`.', parameters: ['X', 'Y'] }] },
  {
    name: 'exp',
    signatures: [
      {
        signature: 'EXP(X)',
        description:
          'Computes e to the power of X, also called the natural exponential function. If\nthe result underflows, this function returns a zero. Generates an error if the\nresult overflows.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'ln',
    signatures: [
      {
        signature: 'LN(X)',
        description: 'Computes the natural logarithm of X. Generates an error if X is less than or\nequal to zero.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'log',
    signatures: [
      {
        signature: 'LOG(X [, Y])',
        description: 'If only X is present, `LOG` is a synonym of `LN`. If Y is also present,\n`LOG` computes the logarithm of X to base Y.',
        parameters: [],
      },
    ],
  },
  { name: 'log10', signatures: [{ signature: 'LOG10(X)', description: 'Similar to `LOG`, but computes logarithm to base 10.', parameters: ['X'] }] },
  {
    name: 'greatest',
    signatures: [
      {
        signature: 'GREATEST(X1,...,XN)',
        description:
          'Returns the greatest value among `X1,...,XN`. If any argument is `NULL`, returns\n`NULL`. Otherwise, in the case of floating-point arguments, if any argument is\n`NaN`, returns `NaN`. In all other cases, returns the value among `X1,...,XN`\nthat has the greatest value according to the ordering used by the `ORDER BY`\nclause. The arguments `X1, ..., XN` must be coercible to a common supertype, and\nthe supertype must support ordering.',
        parameters: ['X1', '...', 'XN'],
      },
    ],
  },
  {
    name: 'least',
    signatures: [
      {
        signature: 'LEAST(X1,...,XN)',
        description:
          'Returns the least value among `X1,...,XN`. If any argument is `NULL`, returns\n`NULL`. Otherwise, in the case of floating-point arguments, if any argument is\n`NaN`, returns `NaN`. In all other cases, returns the value among `X1,...,XN`\nthat has the least value according to the ordering used by the `ORDER BY`\nclause. The arguments `X1, ..., XN` must be coercible to a common supertype, and\nthe supertype must support ordering.',
        parameters: ['X1', '...', 'XN'],
      },
    ],
  },
  {
    name: 'div',
    signatures: [
      {
        signature: 'DIV(X, Y)',
        description: 'Returns the result of integer division of X by Y. Division by zero returns\nan error. Division by -1 may overflow.',
        parameters: ['X', 'Y'],
      },
    ],
  },
  {
    name: 'safe_divide',
    signatures: [
      {
        signature: 'SAFE_DIVIDE(X, Y)',
        description:
          'Equivalent to the division operator (<code>X / Y</code>), but returns\n<code>NULL</code> if an error occurs, such as a division by zero error.',
        parameters: ['X', 'Y'],
      },
    ],
  },
  {
    name: 'safe_multiply',
    signatures: [
      {
        signature: 'SAFE_MULTIPLY(X, Y)',
        description: 'Equivalent to the multiplication operator (<code>*</code>), but returns\n<code>NULL</code> if overflow occurs.',
        parameters: ['X', 'Y'],
      },
    ],
  },
  {
    name: 'safe_negate',
    signatures: [
      {
        signature: 'SAFE_NEGATE(X)',
        description: 'Equivalent to the unary minus operator (<code>-</code>), but returns\n<code>NULL</code> if overflow occurs.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'safe_add',
    signatures: [
      {
        signature: 'SAFE_ADD(X, Y)',
        description: 'Equivalent to the addition operator (<code>+</code>), but returns\n<code>NULL</code> if overflow occurs.',
        parameters: ['X', 'Y'],
      },
    ],
  },
  {
    name: 'safe_subtract',
    signatures: [
      {
        signature: 'SAFE_SUBTRACT(X, Y)',
        description:
          'Returns the result of Y subtracted from X.\nEquivalent to the subtraction operator (<code>-</code>), but returns\n<code>NULL</code> if overflow occurs.',
        parameters: ['X', 'Y'],
      },
    ],
  },
  {
    name: 'mod',
    signatures: [
      {
        signature: 'MOD(X, Y)',
        description:
          'Modulo function: returns the remainder of the division of X by Y. Returned\nvalue has the same sign as X. An error is generated if Y is 0.',
        parameters: ['X', 'Y'],
      },
    ],
  },
  {
    name: 'round',
    signatures: [
      {
        signature: 'ROUND(X [, N])',
        description:
          'If only X is present, rounds X to the nearest integer. If N is present,\nrounds X to N decimal places after the decimal point. If N is negative,\nrounds off digits to the left of the decimal point. Rounds halfway cases\naway from zero. Generates an error if overflow occurs.',
        parameters: [],
      },
    ],
  },
  {
    name: 'trunc',
    signatures: [
      {
        signature: 'TRUNC(X [, N])',
        description:
          'If only X is present, `TRUNC` rounds X to the nearest integer whose absolute\nvalue is not greater than the absolute value of X. If N is also present, `TRUNC`\nbehaves like `ROUND(X, N)`, but always rounds towards zero and never overflows.',
        parameters: [],
      },
    ],
  },
  {
    name: 'ceil',
    signatures: [{ signature: 'CEIL(X)', description: 'Returns the smallest integral value that is not less than X.', parameters: ['X'] }],
  },
  { name: 'ceiling', signatures: [{ signature: 'CEILING(X)', description: 'Synonym of CEIL(X)', parameters: ['X'] }] },
  {
    name: 'floor',
    signatures: [{ signature: 'FLOOR(X)', description: 'Returns the largest integral value that is not greater than X.', parameters: ['X'] }],
  },
  {
    name: 'cos',
    signatures: [{ signature: 'COS(X)', description: 'Computes the cosine of X where X is specified in radians. Never fails.', parameters: ['X'] }],
  },
  {
    name: 'cosh',
    signatures: [
      {
        signature: 'COSH(X)',
        description: 'Computes the hyperbolic cosine of X where X is specified in radians.\nGenerates an error if overflow occurs.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'acos',
    signatures: [
      {
        signature: 'ACOS(X)',
        description:
          'Computes the principal value of the inverse cosine of X. The return value is in\nthe range [0,π]. Generates an error if X is a value outside of the\nrange [-1, 1].',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'acosh',
    signatures: [
      {
        signature: 'ACOSH(X)',
        description: 'Computes the inverse hyperbolic cosine of X. Generates an error if X is a value\nless than 1.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'cot',
    signatures: [
      {
        signature: 'COT(X)',
        description:
          'Computes the cotangent for the angle of `X`, where `X` is specified in radians.\n`X` can be any data type\nthat coerces to `DOUBLE`.\nSupports the `SAFE.` prefix.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'coth',
    signatures: [
      {
        signature: 'COTH(X)',
        description:
          'Computes the hyperbolic cotangent for the angle of `X`, where `X` is specified\nin radians. `X` can be any data type\nthat coerces to `DOUBLE`.\nSupports the `SAFE.` prefix.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'csc',
    signatures: [
      {
        signature: 'CSC(X)',
        description:
          'Computes the cosecant of the input angle, which is in radians.\n`X` can be any data type\nthat coerces to `DOUBLE`.\nSupports the `SAFE.` prefix.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'csch',
    signatures: [
      {
        signature: 'CSCH(X)',
        description:
          'Computes the hyperbolic cosecant of the input angle, which is in radians.\n`X` can be any data type\nthat coerces to `DOUBLE`.\nSupports the `SAFE.` prefix.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'sec',
    signatures: [
      {
        signature: 'SEC(X)',
        description:
          'Computes the secant for the angle of `X`, where `X` is specified in radians.\n`X` can be any data type\nthat coerces to `DOUBLE`.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'sech',
    signatures: [
      {
        signature: 'SECH(X)',
        description:
          'Computes the hyperbolic secant for the angle of `X`, where `X` is specified\nin radians. `X` can be any data type\nthat coerces to `DOUBLE`.\nNever produces an error.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'sin',
    signatures: [{ signature: 'SIN(X)', description: 'Computes the sine of X where X is specified in radians. Never fails.', parameters: ['X'] }],
  },
  {
    name: 'sinh',
    signatures: [
      {
        signature: 'SINH(X)',
        description: 'Computes the hyperbolic sine of X where X is specified in radians. Generates\nan error if overflow occurs.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'asin',
    signatures: [
      {
        signature: 'ASIN(X)',
        description:
          'Computes the principal value of the inverse sine of X. The return value is in\nthe range [-π/2,π/2]. Generates an error if X is outside of\nthe range [-1, 1].',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'asinh',
    signatures: [{ signature: 'ASINH(X)', description: 'Computes the inverse hyperbolic sine of X. Does not fail.', parameters: ['X'] }],
  },
  {
    name: 'tan',
    signatures: [
      {
        signature: 'TAN(X)',
        description: 'Computes the tangent of X where X is specified in radians. Generates an error if\noverflow occurs.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'tanh',
    signatures: [
      {
        signature: 'TANH(X)',
        description: 'Computes the hyperbolic tangent of X where X is specified in radians. Does not\nfail.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'atan',
    signatures: [
      {
        signature: 'ATAN(X)',
        description: 'Computes the principal value of the inverse tangent of X. The return value is\nin the range [-π/2,π/2]. Does not fail.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'atanh',
    signatures: [
      {
        signature: 'ATANH(X)',
        description: 'Computes the inverse hyperbolic tangent of X. Generates an error if X is outside\nof the range [-1, 1].',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'atan2',
    signatures: [
      {
        signature: 'ATAN2(X, Y)',
        description:
          'Calculates the principal value of the inverse tangent of X/Y using the signs of\nthe two arguments to determine the quadrant. The return value is in the range\n[-π,π].',
        parameters: ['X', 'Y'],
      },
    ],
  },
  {
    name: 'cbrt',
    signatures: [
      {
        signature: 'CBRT(X)',
        description: 'Computes the cube root of `X`. `X` can be any data type\nthat coerces to `DOUBLE`.\nSupports the `SAFE.` prefix.',
        parameters: ['X'],
      },
    ],
  },
  {
    name: 'first_value',
    signatures: [
      {
        signature:
          'FIRST_VALUE (value_expression [{RESPECT | IGNORE} NULLS])\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  ORDER BY expression [ { ASC | DESC }  ] [, ...]\n  [ window_frame_clause ]',
        description: 'Returns the value of the `value_expression` for the first row in the current\nwindow frame.',
        parameters: [],
      },
    ],
  },
  {
    name: 'last_value',
    signatures: [
      {
        signature:
          'LAST_VALUE (value_expression [{RESPECT | IGNORE} NULLS])\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  ORDER BY expression [ { ASC | DESC }  ] [, ...]\n  [ window_frame_clause ]',
        description: 'Returns the value of the `value_expression` for the last row in the current\nwindow frame.',
        parameters: [],
      },
    ],
  },
  {
    name: 'nth_value',
    signatures: [
      {
        signature:
          'NTH_VALUE (value_expression, constant_integer_expression [{RESPECT | IGNORE} NULLS])\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  ORDER BY expression [ { ASC | DESC }  ] [, ...]\n  [ window_frame_clause ]',
        description:
          'Returns the value of `value_expression` at the Nth row of the current window\nframe, where Nth is defined by `constant_integer_expression`. Returns NULL if\nthere is no such row.',
        parameters: [],
      },
    ],
  },
  {
    name: 'lead',
    signatures: [
      {
        signature:
          'LEAD (value_expression[, offset [, default_expression]])\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  ORDER BY expression [ { ASC | DESC }  ] [, ...]',
        description:
          'Returns the value of the `value_expression` on a subsequent row. Changing the\n`offset` value changes which subsequent row is returned; the default value is\n`1`, indicating the next row in the window frame. An error occurs if `offset` is\nNULL or a negative value.',
        parameters: [],
      },
    ],
  },
  {
    name: 'lag',
    signatures: [
      {
        signature:
          'LAG (value_expression[, offset [, default_expression]])\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]\n  ORDER BY expression [ { ASC | DESC }  ] [, ...]',
        description:
          'Returns the value of the `value_expression` on a preceding row. Changing the\n`offset` value changes which preceding row is returned; the default value is\n`1`, indicating the previous row in the window frame. An error occurs if\n`offset` is NULL or a negative value.',
        parameters: [],
      },
    ],
  },
  {
    name: 'percentile_cont',
    signatures: [
      {
        signature:
          'PERCENTILE_CONT (value_expression, percentile [{RESPECT | IGNORE} NULLS])\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]',
        description: 'Computes the specified percentile value for the value_expression, with linear\ninterpolation.',
        parameters: [],
      },
    ],
  },
  {
    name: 'percentile_disc',
    signatures: [
      {
        signature:
          'PERCENTILE_DISC (value_expression, percentile [{RESPECT | IGNORE} NULLS])\nOVER over_clause\n\nover_clause:\n  { named_window | ( [ window_specification ] ) }\n\nwindow_specification:\n  [ named_window ]\n  [ PARTITION BY partition_expression [, ...] ]',
        description:
          'Computes the specified percentile value for a discrete `value_expression`. The\nreturned value is the first sorted value of `value_expression` with cumulative\ndistribution greater than or equal to the given `percentile` value.',
        parameters: [],
      },
    ],
  },
  {
    name: 'farm_fingerprint',
    signatures: [
      {
        signature: 'FARM_FINGERPRINT(value)',
        description:
          'Computes the fingerprint of the `STRING` or `BYTES` input using the\n`Fingerprint64` function from the\nopen-source FarmHash library. The output\nof this function for a particular input will never change.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'fingerprint',
    signatures: [
      {
        signature: 'FINGERPRINT(input)',
        description: 'Computes the fingerprint of the `STRING`\nor `BYTES` input using Fingerprint.',
        parameters: ['input'],
      },
    ],
  },
  {
    name: 'md5',
    signatures: [
      {
        signature: 'MD5(input)',
        description:
          'Computes the hash of the input using the\nMD5 algorithm. The input can either be\n`STRING` or `BYTES`. The string version treats the input as an array of bytes.',
        parameters: ['input'],
      },
    ],
  },
  {
    name: 'sha1',
    signatures: [
      {
        signature: 'SHA1(input)',
        description:
          'Computes the hash of the input using the\nSHA-1 algorithm. The input can either be\n`STRING` or `BYTES`. The string version treats the input as an array of bytes.',
        parameters: ['input'],
      },
    ],
  },
  {
    name: 'sha256',
    signatures: [
      {
        signature: 'SHA256(input)',
        description:
          'Computes the hash of the input using the\nSHA-256 algorithm. The input can either be\n`STRING` or `BYTES`. The string version treats the input as an array of bytes.',
        parameters: ['input'],
      },
    ],
  },
  {
    name: 'sha512',
    signatures: [
      {
        signature: 'SHA512(input)',
        description:
          'Computes the hash of the input using the\nSHA-512 algorithm. The input can either be\n`STRING` or `BYTES`. The string version treats the input as an array of bytes.',
        parameters: ['input'],
      },
    ],
  },
  {
    name: 'ascii',
    signatures: [
      {
        signature: 'ASCII(value)',
        description:
          'Returns the ASCII code for the first character or byte in `value`. Returns\n`0` if `value` is empty or the ASCII code is `0` for the first character\nor byte.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'byte_length',
    signatures: [
      {
        signature: 'BYTE_LENGTH(value)',
        description:
          'Returns the length of the `STRING` or `BYTES` value in `BYTES`,\nregardless of whether the type of the value is `STRING` or `BYTES`.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'char_length',
    signatures: [{ signature: 'CHAR_LENGTH(value)', description: 'Returns the length of the `STRING` in characters.', parameters: ['value'] }],
  },
  {
    name: 'character_length',
    signatures: [{ signature: 'CHARACTER_LENGTH(value)', description: 'Synonym for CHAR_LENGTH.', parameters: ['value'] }],
  },
  {
    name: 'chr',
    signatures: [
      {
        signature: 'CHR(value)',
        description:
          'Takes a Unicode code point and returns\nthe character that matches the code point. Each valid code point should fall\nwithin the range of [0, 0xD7FF] and [0xE000, 0x10FFFF]. Returns an empty string\nif the code point is `0`. If an invalid Unicode code point is specified, an\nerror is returned.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'code_points_to_bytes',
    signatures: [
      {
        signature: 'CODE_POINTS_TO_BYTES(ascii_code_points)',
        description: 'Takes an array of extended ASCII\ncode points\n(`ARRAY` of `INT64`) and returns `BYTES`.',
        parameters: ['ascii_code_points'],
      },
    ],
  },
  {
    name: 'code_points_to_string',
    signatures: [
      {
        signature: 'CODE_POINTS_TO_STRING(unicode_code_points)',
        description: 'Takes an array of Unicode code points\n(`ARRAY` of `INT64`) and returns a `STRING`.',
        parameters: ['unicode_code_points'],
      },
    ],
  },
  {
    name: 'collate',
    signatures: [
      {
        signature: 'COLLATE(value, collate_specification)',
        description: 'Concatenates one or more values into a single result. All values must be\n`BYTES` or data types that can be cast to `STRING`.',
        parameters: ['value', 'collate_specification'],
      },
    ],
  },
  {
    name: 'ends_with',
    signatures: [
      {
        signature: 'ENDS_WITH(value1, value2)',
        description: 'Takes two `STRING` or `BYTES` values. Returns `TRUE` if the second\nvalue is a suffix of the first.',
        parameters: ['value1', 'value2'],
      },
    ],
  },
  { name: 'format', signatures: [{ signature: '', description: '`FORMAT` formats a data type expression as a string.', parameters: [] }] },
  {
    name: 'from_base32',
    signatures: [
      {
        signature: 'FROM_BASE32(string_expr)',
        description:
          'Converts the base32-encoded input `string_expr` into `BYTES` format. To convert\n`BYTES` to a base32-encoded `STRING`, use TO_BASE32.',
        parameters: ['string_expr'],
      },
    ],
  },
  {
    name: 'from_base64',
    signatures: [
      {
        signature: 'FROM_BASE64(string_expr)',
        description:
          'Converts the base64-encoded input `string_expr` into\n`BYTES` format. To convert\n`BYTES` to a base64-encoded `STRING`,\nuse TO_BASE64.',
        parameters: ['string_expr'],
      },
    ],
  },
  {
    name: 'from_hex',
    signatures: [
      {
        signature: 'FROM_HEX(string)',
        description:
          'Converts a hexadecimal-encoded `STRING` into `BYTES` format. Returns an error\nif the input `STRING` contains characters outside the range\n`(0..9, A..F, a..f)`. The lettercase of the characters does not matter. If the\ninput `STRING` has an odd number of characters, the function acts as if the\ninput has an additional leading `0`. To convert `BYTES` to a hexadecimal-encoded\n`STRING`, use TO_HEX.',
        parameters: ['string'],
      },
    ],
  },
  {
    name: 'initcap',
    signatures: [
      {
        signature: 'INITCAP(value[, delimiters])',
        description:
          'Takes a `STRING` and returns it with the first character in each word in\nuppercase and all other characters in lowercase. Non-alphabetic characters\nremain the same.',
        parameters: [],
      },
    ],
  },
  {
    name: 'instr',
    signatures: [
      {
        signature: 'INSTR(source_value, search_value[, position[, occurrence]])',
        description:
          'Returns the lowest 1-based index of `search_value` in `source_value`. 0 is\nreturned when no match is found. `source_value` and `search_value` must be the\nsame type, either `STRING` or `BYTES`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'left',
    signatures: [
      {
        signature: 'LEFT(value, length)',
        description:
          'Returns a `STRING` or `BYTES` value that consists of the specified\nnumber of leftmost characters or bytes from `value`. The `length` is an\n`INT64` that specifies the length of the returned\nvalue. If `value` is of type `BYTES`, `length` is the number of leftmost bytes\nto return. If `value` is `STRING`, `length` is the number of leftmost characters\nto return.',
        parameters: ['value', 'length'],
      },
    ],
  },
  {
    name: 'length',
    signatures: [
      {
        signature: 'LENGTH(value)',
        description:
          'Returns the length of the `STRING` or `BYTES` value. The returned\nvalue is in characters for `STRING` arguments and in bytes for the `BYTES`\nargument.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'lpad',
    signatures: [
      {
        signature: 'LPAD(original_value, return_length[, pattern])',
        description:
          'Returns a `STRING` or `BYTES` value that consists of `original_value` prepended\nwith `pattern`. The `return_length` is an `INT64` that\nspecifies the length of the returned value. If `original_value` is of type\n`BYTES`, `return_length` is the number of bytes. If `original_value` is\nof type `STRING`, `return_length` is the number of characters.',
        parameters: [],
      },
    ],
  },
  {
    name: 'lower',
    signatures: [
      {
        signature: 'LOWER(value)',
        description:
          'For `STRING` arguments, returns the original string with all alphabetic\ncharacters in lowercase. Mapping between lowercase and uppercase is done\naccording to the\nUnicode Character Database\nwithout taking into account language-specific mappings.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'ltrim',
    signatures: [{ signature: 'LTRIM(value1[, value2])', description: 'Identical to TRIM, but only removes leading characters.', parameters: [] }],
  },
  {
    name: 'normalize',
    signatures: [
      {
        signature: 'NORMALIZE(value[, normalization_mode])',
        description: 'Takes a string value and returns it as a normalized string. If you do not\nprovide a normalization mode, `NFC` is used.',
        parameters: [],
      },
    ],
  },
  {
    name: 'normalize_and_casefold',
    signatures: [
      {
        signature: 'NORMALIZE_AND_CASEFOLD(value[, normalization_mode])',
        description: 'Takes a string value and returns it as a normalized string. If you do not\nprovide a normalization mode, `NFC` is used.',
        parameters: [],
      },
    ],
  },
  {
    name: 'octet_length',
    signatures: [
      {
        signature: 'OCTET_LENGTH(value)',
        description: 'Returns `TRUE` if `value` is a partial match for the regular expression,\n`regexp`.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'regexp_extract',
    signatures: [
      {
        signature: 'REGEXP_EXTRACT(value, regexp)',
        description: 'Returns the first substring in `value` that matches the regular expression,\n`regexp`. Returns `NULL` if there is no match.',
        parameters: ['value', 'regexp'],
      },
    ],
  },
  {
    name: 'regexp_extract_all',
    signatures: [
      {
        signature: 'REGEXP_EXTRACT_ALL(value, regexp)',
        description: 'Returns an array of all substrings of `value` that match the regular expression,\n`regexp`.',
        parameters: ['value', 'regexp'],
      },
    ],
  },
  {
    name: 'regexp_instr',
    signatures: [
      {
        signature: 'REGEXP_INSTR(source_value, regexp [, position[, occurrence, [occurrence_position]]])',
        description:
          'Returns the lowest 1-based index of a regular expression, `regexp`, in\n`source_value`. Returns `0` when no match is found or the regular expression\nis empty. Returns an error if the regular expression is invalid or has more than\none capturing group. `source_value` and `regexp` must be the same type, either\n`STRING` or `BYTES`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'regexp_match',
    signatures: [{ signature: '', description: 'Returns `TRUE` if `value` is a full match for the regular expression, `regexp`.', parameters: [] }],
  },
  {
    name: 'regexp_replace',
    signatures: [
      {
        signature: 'REGEXP_REPLACE(value, regexp, replacement)',
        description: 'Returns a `STRING` where all substrings of `value` that\nmatch regular expression `regexp` are replaced with `replacement`.',
        parameters: ['value', 'regexp', 'replacement'],
      },
    ],
  },
  {
    name: 'replace',
    signatures: [
      {
        signature: 'REPLACE(original_value, from_value, to_value)',
        description:
          'Replaces all occurrences of `from_value` with `to_value` in `original_value`.\nIf `from_value` is empty, no replacement is made.',
        parameters: ['original_value', 'from_value', 'to_value'],
      },
    ],
  },
  {
    name: 'repeat',
    signatures: [
      {
        signature: 'REPEAT(original_value, repetitions)',
        description:
          'Returns a `STRING` or `BYTES` value that consists of `original_value`, repeated.\nThe `repetitions` parameter specifies the number of times to repeat\n`original_value`. Returns `NULL` if either `original_value` or `repetitions`\nare `NULL`.',
        parameters: ['original_value', 'repetitions'],
      },
    ],
  },
  {
    name: 'reverse',
    signatures: [{ signature: 'REVERSE(value)', description: 'Returns the reverse of the input `STRING` or `BYTES`.', parameters: ['value'] }],
  },
  {
    name: 'right',
    signatures: [
      {
        signature: 'RIGHT(value, length)',
        description:
          'Returns a `STRING` or `BYTES` value that consists of the specified\nnumber of rightmost characters or bytes from `value`. The `length` is an\n`INT64` that specifies the length of the returned\nvalue. If `value` is `BYTES`, `length` is the number of rightmost bytes to\nreturn. If `value` is `STRING`, `length` is the number of rightmost characters\nto return.',
        parameters: ['value', 'length'],
      },
    ],
  },
  {
    name: 'rpad',
    signatures: [
      {
        signature: 'RPAD(original_value, return_length[, pattern])',
        description:
          'Returns a `STRING` or `BYTES` value that consists of `original_value` appended\nwith `pattern`. The `return_length` parameter is an\n`INT64` that specifies the length of the\nreturned value. If `original_value` is `BYTES`,\n`return_length` is the number of bytes. If `original_value` is `STRING`,\n`return_length` is the number of characters.',
        parameters: [],
      },
    ],
  },
  {
    name: 'rtrim',
    signatures: [{ signature: 'RTRIM(value1[, value2])', description: 'Identical to TRIM, but only removes trailing characters.', parameters: [] }],
  },
  {
    name: 'safe_convert_bytes_to_string',
    signatures: [
      {
        signature: 'SAFE_CONVERT_BYTES_TO_STRING(value)',
        description:
          'Converts a sequence of `BYTES` to a `STRING`. Any invalid UTF-8 characters are\nreplaced with the Unicode replacement character, `U+FFFD`.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'soundex',
    signatures: [
      { signature: 'SOUNDEX(value)', description: 'Returns a `STRING` that represents the\nSoundex code for `value`.', parameters: ['value'] },
    ],
  },
  {
    name: 'split',
    signatures: [{ signature: 'SPLIT(value[, delimiter])', description: 'Splits `value` using the `delimiter` argument.', parameters: [] }],
  },
  {
    name: 'starts_with',
    signatures: [
      {
        signature: 'STARTS_WITH(value1, value2)',
        description: 'Takes two `STRING` or `BYTES` values. Returns `TRUE` if the second value is a\nprefix of the first.',
        parameters: ['value1', 'value2'],
      },
    ],
  },
  {
    name: 'strpos',
    signatures: [
      {
        signature: 'STRPOS(value1, value2)',
        description:
          'Takes two `STRING` or `BYTES` values. Returns the 1-based index of the first\noccurrence of `value2` inside `value1`. Returns `0` if `value2` is not found.',
        parameters: ['value1', 'value2'],
      },
    ],
  },
  {
    name: 'substr',
    signatures: [
      {
        signature: 'SUBSTR(value, position[, length])',
        description: 'Returns a substring of the supplied `STRING` or `BYTES` value.',
        parameters: [],
      },
    ],
  },
  {
    name: 'substring',
    signatures: [
      {
        signature: 'SUBSTRING(value, position[, length])',
        description:
          'Converts a sequence of `BYTES` into a base32-encoded `STRING`. To convert a\nbase32-encoded `STRING` into `BYTES`, use FROM_BASE32.',
        parameters: [],
      },
    ],
  },
  {
    name: 'to_base64',
    signatures: [
      {
        signature: 'TO_BASE64(bytes_expr)',
        description:
          'Converts a sequence of `BYTES` into a base64-encoded `STRING`. To convert a\nbase64-encoded `STRING` into `BYTES`, use FROM_BASE64.',
        parameters: ['bytes_expr'],
      },
    ],
  },
  {
    name: 'to_code_points',
    signatures: [{ signature: 'TO_CODE_POINTS(value)', description: 'Takes a value and returns an array of\n`INT64`.', parameters: ['value'] }],
  },
  {
    name: 'to_hex',
    signatures: [
      {
        signature: 'TO_HEX(bytes)',
        description:
          'Converts a sequence of `BYTES` into a hexadecimal `STRING`. Converts each byte\nin the `STRING` as two hexadecimal characters in the range\n`(0..9, a..f)`. To convert a hexadecimal-encoded\n`STRING` to `BYTES`, use FROM_HEX.',
        parameters: ['bytes'],
      },
    ],
  },
  {
    name: 'translate',
    signatures: [
      {
        signature: 'TRANSLATE(expression, source_characters, target_characters)',
        description:
          'In `expression`, replaces each character in `source_characters` with the\ncorresponding character in `target_characters`. All inputs must be the same\ntype, either `STRING` or `BYTES`.',
        parameters: ['expression', 'source_characters', 'target_characters'],
      },
    ],
  },
  {
    name: 'trim',
    signatures: [
      { signature: 'TRIM(value_to_trim[, set_of_characters_to_remove])', description: 'Takes a `STRING` or `BYTES` value to trim.', parameters: [] },
    ],
  },
  {
    name: 'unicode',
    signatures: [
      {
        signature: 'UNICODE(value)',
        description:
          'Returns the Unicode code point for the first character in\n`value`. Returns `0` if `value` is empty, or if the resulting Unicode code\npoint is `0`.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'upper',
    signatures: [
      {
        signature: 'UPPER(value)',
        description:
          'For `STRING` arguments, returns the original string with all alphabetic\ncharacters in uppercase. Mapping between uppercase and lowercase is done\naccording to the\nUnicode Character Database\nwithout taking into account language-specific mappings.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'json_extract',
    signatures: [
      {
        signature: '',
        description:
          'Extracts a JSON value, such as an array or object, or a JSON scalar\nvalue, such as a string, number, or boolean. If a JSON key uses invalid\nJSONPath characters, then you can escape those characters\nusing single quotes and brackets.',
        parameters: [],
      },
    ],
  },
  {
    name: 'json_query',
    signatures: [
      {
        signature: 'JSON_QUERY(json_string_expr, json_path)',
        description:
          'Extracts a JSON value, such as an array or object, or a JSON scalar\nvalue, such as a string, number, or boolean. If a JSON key uses invalid\nJSONPath characters, then you can escape those characters\nusing double quotes.',
        parameters: ['json_string_expr', 'json_path'],
      },
    ],
  },
  {
    name: 'json_extract_scalar',
    signatures: [
      {
        signature: '',
        description:
          'Extracts a scalar value and then returns it as a string. A scalar value can\nrepresent a string, number, or boolean. Removes the outermost quotes and\nunescapes the return values. If a JSON key uses invalid\nJSONPath characters, then you can escape those characters\nusing single quotes and brackets.',
        parameters: [],
      },
    ],
  },
  {
    name: 'json_value',
    signatures: [
      {
        signature: 'JSON_VALUE(json_string_expr[, json_path])',
        description:
          'Extracts a scalar value and then returns it as a string. A scalar value can\nrepresent a string, number, or boolean. Removes the outermost quotes and\nunescapes the return values. If a JSON key uses invalid\nJSONPath characters, then you can escape those characters\nusing double quotes.',
        parameters: [],
      },
    ],
  },
  {
    name: 'json_query_array',
    signatures: [
      {
        signature: 'JSON_QUERY_ARRAY(json_string_expr[, json_path])',
        description:
          'Extracts an array of JSON values, such as arrays or objects, and\nJSON scalar values, such as strings, numbers, and booleans.\nIf a JSON key uses invalid\nJSONPath characters, then you can escape those characters\nusing double quotes.',
        parameters: [],
      },
    ],
  },
  {
    name: 'json_value_array',
    signatures: [
      {
        signature: 'JSON_VALUE_ARRAY(json_string_expr[, json_path])',
        description:
          'Extracts an array of scalar values and returns an array of string-formatted\nscalar values. A scalar value can represent a string, number, or boolean.\nIf a JSON key uses invalid JSONPath characters, you can\nescape those characters using double quotes.',
        parameters: [],
      },
    ],
  },
  {
    name: 'parse_json',
    signatures: [
      {
        signature: "PARSE_JSON(json_string_expr[, wide_number_mode=>{ 'exact' | 'round' }])",
        description: 'Takes a SQL `STRING` value and returns a SQL `JSON` value.\nThe `STRING` value represents a string-formatted JSON value.',
        parameters: [],
      },
    ],
  },
  {
    name: 'string',
    signatures: [
      {
        signature: '',
        description:
          'Takes a JSON expression, extracts a JSON string, and returns that value as a SQL\n`STRING`. If the expression is SQL `NULL`, the function returns SQL\n`NULL`. If the extracted JSON value is not a string, an error is produced.',
        parameters: [],
      },
    ],
  },
  {
    name: 'bool',
    signatures: [
      {
        signature: '',
        description:
          'Takes a JSON expression, extracts a JSON boolean, and returns that value as a SQL\n`BOOL`. If the expression is SQL `NULL`, the function returns SQL\n`NULL`. If the extracted JSON value is not a boolean, an error is produced.',
        parameters: [],
      },
    ],
  },
  {
    name: 'int64',
    signatures: [
      {
        signature: '',
        description:
          'Takes a JSON expression, extracts a JSON number and returns that value as a SQL\n`INT64`. If the expression is SQL `NULL`, the function returns SQL\n`NULL`. If the extracted JSON number has a fractional part or is outside of the\nINT64 domain, an error is produced.',
        parameters: [],
      },
    ],
  },
  {
    name: 'double',
    signatures: [
      {
        signature: '',
        description:
          'Takes a JSON expression, extracts a JSON number and returns that value as a SQL\n`DOUBLE`. If the expression is SQL `NULL`, the\nfunction returns SQL `NULL`. If the extracted JSON value is not a number, an\nerror is produced.',
        parameters: [],
      },
    ],
  },
  {
    name: 'json_type',
    signatures: [
      {
        signature: '',
        description:
          'Takes a JSON expression and returns the type of the outermost JSON value as a\nSQL `STRING`. The names of these JSON types can be returned:',
        parameters: [],
      },
    ],
  },
  {
    name: 'array',
    signatures: [
      {
        signature: 'ARRAY(subquery)',
        description: 'The `ARRAY` function returns an `ARRAY` with one element for each row in a\nsubquery.',
        parameters: ['subquery'],
      },
    ],
  },
  {
    name: 'array_concat',
    signatures: [
      {
        signature: 'ARRAY_CONCAT(array_expression[, ...])',
        description: 'Concatenates one or more arrays with the same element type into a single array.',
        parameters: [],
      },
    ],
  },
  {
    name: 'array_filter',
    signatures: [
      {
        signature:
          'ARRAY_FILTER(array_expression, lambda_expression)\n\nlambda_expression:\n  {\n    element_alias->boolean_expression\n    | (element_alias, index_alias)->boolean_expression\n  }',
        description: 'Takes an array, filters out unwanted elements, and returns the results in a new\narray.',
        parameters: ['array_expression', 'lambda_expression'],
      },
    ],
  },
  {
    name: 'array_first',
    signatures: [
      {
        signature: 'ARRAY_FIRST(array_expression)',
        description: 'Takes an array and returns the first element in the array.',
        parameters: ['array_expression'],
      },
    ],
  },
  {
    name: 'array_includes',
    signatures: [
      {
        signature: '',
        description: 'Takes an array and returns `TRUE` if there is an element in the array that is\nequal to the search_value.',
        parameters: [],
      },
    ],
  },
  {
    name: 'array_includes_any',
    signatures: [
      {
        signature: 'ARRAY_INCLUDES_ANY(array_to_search, search_values)',
        description:
          'Takes an array to search and an array of search values. Returns `TRUE` if any\nsearch values are in the array to search, otherwise returns `FALSE`.',
        parameters: ['array_to_search', 'search_values'],
      },
    ],
  },
  {
    name: 'array_includes_all',
    signatures: [
      {
        signature: 'ARRAY_INCLUDES_ALL(array_to_search, search_values)',
        description:
          'Takes an array to search and an array of search values. Returns `TRUE` if all\nsearch values are in the array to search, otherwise returns `FALSE`.',
        parameters: ['array_to_search', 'search_values'],
      },
    ],
  },
  {
    name: 'array_last',
    signatures: [
      {
        signature: 'ARRAY_LAST(array_expression)',
        description: 'Takes an array and returns the last element in the array.',
        parameters: ['array_expression'],
      },
    ],
  },
  {
    name: 'array_length',
    signatures: [
      {
        signature: 'ARRAY_LENGTH(array_expression)',
        description: 'Returns the size of the array. Returns 0 for an empty array. Returns `NULL` if\nthe `array_expression` is `NULL`.',
        parameters: ['array_expression'],
      },
    ],
  },
  {
    name: 'array_slice',
    signatures: [
      {
        signature: 'ARRAY_SLICE(array_to_slice, start_offset, end_offset)',
        description: 'Returns an array containing zero or more consecutive elements from the\ninput array.',
        parameters: ['array_to_slice', 'start_offset', 'end_offset'],
      },
    ],
  },
  {
    name: 'array_to_string',
    signatures: [
      {
        signature: 'ARRAY_TO_STRING(array_expression, delimiter[, null_text])',
        description:
          'Returns a concatenation of the elements in `array_expression`\nas a STRING. The value for `array_expression`\ncan either be an array of STRING or\nBYTES data types.',
        parameters: [],
      },
    ],
  },
  {
    name: 'array_transform',
    signatures: [
      {
        signature:
          'ARRAY_TRANSFORM(array_expression, lambda_expression)\n\nlambda_expression:\n  {\n    element_alias->transform_expression\n    | (element_alias, index_alias)->transform_expression\n  }',
        description:
          'Takes an array, transforms the elements, and returns the results in a new array.\nThe output array always has the same length as the input array.',
        parameters: ['array_expression', 'lambda_expression'],
      },
    ],
  },
  {
    name: 'flatten',
    signatures: [
      {
        signature: 'FLATTEN(array_elements_field_access_expression)',
        description:
          'Takes a nested array and flattens a specific part of it into a single, flat\narray with the\narray elements field access operator.\nReturns `NULL` if the input value is `NULL`.\nIf `NULL` array elements are\nencountered, they are added to the resulting array.',
        parameters: ['array_elements_field_access_expression'],
      },
    ],
  },
  {
    name: 'generate_array',
    signatures: [
      {
        signature: 'GENERATE_ARRAY(start_expression, end_expression[, step_expression])',
        description:
          'Returns an array of values. The `start_expression` and `end_expression`\nparameters determine the inclusive start and end of the array.',
        parameters: [],
      },
    ],
  },
  {
    name: 'generate_date_array',
    signatures: [
      {
        signature: 'GENERATE_DATE_ARRAY(start_date, end_date[, INTERVAL INT64_expr date_part])',
        description: 'Returns an array of dates. The `start_date` and `end_date`\nparameters determine the inclusive start and end of the array.',
        parameters: [],
      },
    ],
  },
  {
    name: 'generate_timestamp_array',
    signatures: [
      {
        signature: 'GENERATE_TIMESTAMP_ARRAY(start_timestamp, end_timestamp,\n                         INTERVAL step_expression date_part)',
        description:
          'Returns an `ARRAY` of `TIMESTAMPS` separated by a given interval. The\n`start_timestamp` and `end_timestamp` parameters determine the inclusive\nlower and upper bounds of the `ARRAY`.',
        parameters: ['start_timestamp', 'end_timestamp', 'INTERVAL step_expression date_part'],
      },
    ],
  },
  {
    name: 'array_reverse',
    signatures: [
      { signature: 'ARRAY_REVERSE(value)', description: 'Returns the input ARRAY with elements in reverse order.', parameters: ['value'] },
    ],
  },
  {
    name: 'array_is_distinct',
    signatures: [
      {
        signature: 'ARRAY_IS_DISTINCT(value)',
        description: 'Returns true if the array contains no repeated elements, using the same equality\ncomparison logic as `SELECT DISTINCT`.',
        parameters: ['value'],
      },
    ],
  },
  {
    name: 'current_date',
    signatures: [
      {
        signature: 'CURRENT_DATE([time_zone])',
        description: 'Returns the current date as of the specified or default time zone. Parentheses\nare optional when called with no\narguments.',
        parameters: [],
      },
    ],
  },
  {
    name: 'extract',
    signatures: [
      {
        signature: 'EXTRACT(part FROM date_expression)',
        description: 'Returns the value corresponding to the specified date part. The `part` must\nbe one of:',
        parameters: ['part FROM date_expression'],
      },
    ],
  },
  {
    name: 'date',
    signatures: [
      {
        signature: 'DATE(year, month, day)',
        description: 'Constructs a DATE from INT64 values representing\nthe year, month, and day.',
        parameters: ['year', 'month', 'day'],
      },
      {
        signature: 'DATE(timestamp_expression[, time_zone])',
        description:
          'Extracts the DATE from a TIMESTAMP expression. It supports an\noptional parameter to specify a time zone. If no\ntime zone is specified, the default time zone, which is implementation defined, is used.',
        parameters: [],
      },
      { signature: 'DATE(datetime_expression)', description: 'Extracts the DATE from a DATETIME expression.', parameters: ['datetime_expression'] },
    ],
  },
  {
    name: 'date_add',
    signatures: [
      {
        signature: 'DATE_ADD(date_expression, INTERVAL int64_expression date_part)',
        description: 'Adds a specified time interval to a DATE.',
        parameters: ['date_expression', 'INTERVAL int64_expression date_part'],
      },
    ],
  },
  {
    name: 'date_sub',
    signatures: [
      {
        signature: 'DATE_SUB(date_expression, INTERVAL int64_expression date_part)',
        description: 'Subtracts a specified time interval from a DATE.',
        parameters: ['date_expression', 'INTERVAL int64_expression date_part'],
      },
    ],
  },
  {
    name: 'date_diff',
    signatures: [
      {
        signature: 'DATE_DIFF(date_expression_a, date_expression_b, date_part)',
        description:
          'Returns the whole number of specified `date_part` intervals between two\n`DATE` objects (`date_expression_a` - `date_expression_b`).\nIf the first `DATE` is earlier than the second one,\nthe output is negative.',
        parameters: ['date_expression_a', 'date_expression_b', 'date_part'],
      },
    ],
  },
  {
    name: 'date_trunc',
    signatures: [
      {
        signature: 'DATE_TRUNC(date_expression, date_part)',
        description:
          'Truncates a `DATE` value to the granularity of `date_part`. The `DATE` value\nis always rounded to the beginning of `date_part`, which can be one of the\nfollowing:',
        parameters: ['date_expression', 'date_part'],
      },
    ],
  },
  {
    name: 'date_from_unix_date',
    signatures: [
      {
        signature: 'DATE_FROM_UNIX_DATE(int64_expression)',
        description: 'Interprets `int64_expression` as the number of days since 1970-01-01.',
        parameters: ['int64_expression'],
      },
    ],
  },
  {
    name: 'format_date',
    signatures: [
      {
        signature: 'FORMAT_DATE(format_string, date_expr)',
        description: 'Formats the `date_expr` according to the specified `format_string`.',
        parameters: ['format_string', 'date_expr'],
      },
    ],
  },
  {
    name: 'last_day',
    signatures: [
      {
        signature: 'LAST_DAY(date_expression[, date_part])',
        description: 'Returns the last day from a date expression. This is commonly used to return\nthe last day of the month.',
        parameters: [],
      },
    ],
  },
  {
    name: 'parse_date',
    signatures: [
      {
        signature: 'PARSE_DATE(format_string, date_string)',
        description: 'Converts a string representation of date to a\n`DATE` object.',
        parameters: ['format_string', 'date_string'],
      },
    ],
  },
  {
    name: 'unix_date',
    signatures: [
      { signature: 'UNIX_DATE(date_expression)', description: 'Returns the number of days since 1970-01-01.', parameters: ['date_expression'] },
    ],
  },
  {
    name: 'current_datetime',
    signatures: [
      {
        signature: 'CURRENT_DATETIME([time_zone])',
        description: 'Returns the current time as a `DATETIME` object. Parentheses are optional when\ncalled with no arguments.',
        parameters: [],
      },
    ],
  },
  {
    name: 'datetime',
    signatures: [
      {
        signature: 'DATETIME(year, month, day, hour, minute, second)',
        description: 'Constructs a `DATETIME` object using `INT64` values\nrepresenting the year, month, day, hour, minute, and second.',
        parameters: ['year', 'month', 'day', 'hour', 'minute', 'second'],
      },
      {
        signature: 'DATETIME(date_expression[, time_expression])',
        description: 'Constructs a `DATETIME` object using a DATE object and an optional `TIME`\nobject.',
        parameters: [],
      },
      {
        signature: 'DATETIME(timestamp_expression [, time_zone])',
        description:
          'Constructs a `DATETIME` object using a `TIMESTAMP` object. It supports an\noptional parameter to\nspecify a time zone.\nIf no time zone is specified, the default time zone, which is implementation defined,\nis used.',
        parameters: [],
      },
    ],
  },
  {
    name: 'datetime_add',
    signatures: [
      {
        signature: 'DATETIME_ADD(datetime_expression, INTERVAL int64_expression part)',
        description: 'Adds `int64_expression` units of `part` to the `DATETIME` object.',
        parameters: ['datetime_expression', 'INTERVAL int64_expression part'],
      },
    ],
  },
  {
    name: 'datetime_sub',
    signatures: [
      {
        signature: 'DATETIME_SUB(datetime_expression, INTERVAL int64_expression part)',
        description: 'Subtracts `int64_expression` units of `part` from the `DATETIME`.',
        parameters: ['datetime_expression', 'INTERVAL int64_expression part'],
      },
    ],
  },
  {
    name: 'datetime_diff',
    signatures: [
      {
        signature: 'DATETIME_DIFF(datetime_expression_a, datetime_expression_b, part)',
        description:
          'Returns the whole number of specified `part` intervals between two\n`DATETIME` objects (`datetime_expression_a` - `datetime_expression_b`).\nIf the first `DATETIME` is earlier than the second one,\nthe output is negative. Throws an error if the computation overflows the\nresult type, such as if the difference in\nnanoseconds\nbetween the two `DATETIME` objects would overflow an\n`INT64` value.',
        parameters: ['datetime_expression_a', 'datetime_expression_b', 'part'],
      },
    ],
  },
  {
    name: 'datetime_trunc',
    signatures: [
      {
        signature: 'DATETIME_TRUNC(datetime_expression, date_time_part)',
        description:
          'Truncates a `DATETIME` value to the granularity of `date_time_part`.\nThe `DATETIME` value is always rounded to the beginning of `date_time_part`,\nwhich can be one of the following:',
        parameters: ['datetime_expression', 'date_time_part'],
      },
    ],
  },
  {
    name: 'format_datetime',
    signatures: [
      {
        signature: 'FORMAT_DATETIME(format_string, datetime_expression)',
        description:
          'Formats a `DATETIME` object according to the specified `format_string`. See\nSupported Format Elements For DATETIME\nfor a list of format elements that this function supports.',
        parameters: ['format_string', 'datetime_expression'],
      },
    ],
  },
  {
    name: 'parse_datetime',
    signatures: [
      {
        signature: 'PARSE_DATETIME(format_string, datetime_string)',
        description: 'Converts a string representation of a datetime to a\n`DATETIME` object.',
        parameters: ['format_string', 'datetime_string'],
      },
    ],
  },
  {
    name: 'current_time',
    signatures: [
      {
        signature: 'CURRENT_TIME([time_zone])',
        description: 'Returns the current time as a `TIME` object. Parentheses are optional when\ncalled with no arguments.',
        parameters: [],
      },
    ],
  },
  {
    name: 'time',
    signatures: [
      {
        signature: 'TIME(hour, minute, second)',
        description: 'Constructs a `TIME` object using `INT64`\nvalues representing the hour, minute, and second.',
        parameters: ['hour', 'minute', 'second'],
      },
      {
        signature: 'TIME(timestamp, [time_zone])',
        description:
          'Constructs a `TIME` object using a `TIMESTAMP` object. It supports an\noptional\nparameter to specify a time zone. If no\ntime zone is specified, the default time zone, which is implementation defined, is\nused.',
        parameters: [],
      },
      { signature: 'TIME(datetime)', description: 'Constructs a `TIME` object using a\n`DATETIME` object.', parameters: ['datetime'] },
    ],
  },
  {
    name: 'time_add',
    signatures: [
      {
        signature: 'TIME_ADD(time_expression, INTERVAL int64_expression part)',
        description: 'Adds `int64_expression` units of `part` to the `TIME` object.',
        parameters: ['time_expression', 'INTERVAL int64_expression part'],
      },
    ],
  },
  {
    name: 'time_sub',
    signatures: [
      {
        signature: 'TIME_SUB(time_expression, INTERVAL int64_expression part)',
        description: 'Subtracts `int64_expression` units of `part` from the `TIME` object.',
        parameters: ['time_expression', 'INTERVAL int64_expression part'],
      },
    ],
  },
  {
    name: 'time_diff',
    signatures: [
      {
        signature: 'TIME_DIFF(time_expression_a, time_expression_b, part)',
        description:
          'Returns the whole number of specified `part` intervals between two\n`TIME` objects (`time_expression_a` - `time_expression_b`). If the first\n`TIME` is earlier than the second one, the output is negative. Throws an error\nif the computation overflows the result type, such as if the difference in\nnanoseconds\nbetween the two `TIME` objects would overflow an\n`INT64` value.',
        parameters: ['time_expression_a', 'time_expression_b', 'part'],
      },
    ],
  },
  {
    name: 'time_trunc',
    signatures: [
      {
        signature: 'TIME_TRUNC(time_expression, time_part)',
        description:
          'Truncates a `TIME` value to the granularity of `time_part`. The `TIME` value\nis always rounded to the beginning of `time_part`, which can be one of the\nfollowing:',
        parameters: ['time_expression', 'time_part'],
      },
    ],
  },
  {
    name: 'format_time',
    signatures: [
      {
        signature: 'FORMAT_TIME(format_string, time_object)',
        description: 'Converts a string representation of time to a\n`TIME` object.',
        parameters: ['format_string', 'time_object'],
      },
    ],
  },
  {
    name: 'current_timestamp',
    signatures: [
      {
        signature: 'CURRENT_TIMESTAMP()',
        description:
          '`CURRENT_TIMESTAMP()` produces a TIMESTAMP value that is continuous,\nnon-ambiguous, has exactly 60 seconds per minute and does not repeat values over\nthe leap second. Parentheses are optional.',
        parameters: [],
      },
    ],
  },
  {
    name: 'timestamp',
    signatures: [
      {
        signature: 'TIMESTAMP(string_expression[, time_zone])\nTIMESTAMP(date_expression[, time_zone])\nTIMESTAMP(datetime_expression[, time_zone])',
        description: '',
        parameters: [],
      },
    ],
  },
  {
    name: 'timestamp_add',
    signatures: [
      {
        signature: 'TIMESTAMP_ADD(timestamp_expression, INTERVAL int64_expression date_part)',
        description: 'Adds `int64_expression` units of `date_part` to the timestamp, independent of\nany time zone.',
        parameters: ['timestamp_expression', 'INTERVAL int64_expression date_part'],
      },
    ],
  },
  {
    name: 'timestamp_sub',
    signatures: [
      {
        signature: 'TIMESTAMP_SUB(timestamp_expression, INTERVAL int64_expression date_part)',
        description: 'Subtracts `int64_expression` units of `date_part` from the timestamp,\nindependent of any time zone.',
        parameters: ['timestamp_expression', 'INTERVAL int64_expression date_part'],
      },
    ],
  },
  {
    name: 'timestamp_diff',
    signatures: [
      {
        signature: 'TIMESTAMP_DIFF(timestamp_expression_a, timestamp_expression_b, date_part)',
        description:
          'Returns the whole number of specified `date_part` intervals between two\n`TIMESTAMP` objects (`timestamp_expression_a` - `timestamp_expression_b`).\nIf the first `TIMESTAMP` is earlier than the second one,\nthe output is negative. Throws an error if the computation overflows the\nresult type, such as if the difference in\nnanoseconds\nbetween the two `TIMESTAMP` objects would overflow an\n`INT64` value.',
        parameters: ['timestamp_expression_a', 'timestamp_expression_b', 'date_part'],
      },
    ],
  },
  {
    name: 'timestamp_trunc',
    signatures: [
      {
        signature: 'TIMESTAMP_TRUNC(timestamp_expression, date_time_part[, time_zone])',
        description:
          'Truncates a `TIMESTAMP` value to the granularity of `date_time_part`.\nThe `TIMESTAMP` value is always rounded to the beginning of `date_time_part`,\nwhich can be one of the following:',
        parameters: [],
      },
    ],
  },
  {
    name: 'format_timestamp',
    signatures: [
      {
        signature: 'FORMAT_TIMESTAMP(format_string, timestamp[, time_zone])',
        description: 'Formats a timestamp according to the specified `format_string`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'parse_timestamp',
    signatures: [
      {
        signature: 'PARSE_TIMESTAMP(format_string, timestamp_string[, time_zone])',
        description: 'Converts a string representation of a timestamp to a\n`TIMESTAMP` object.',
        parameters: [],
      },
    ],
  },
  {
    name: 'timestamp_seconds',
    signatures: [
      {
        signature: 'TIMESTAMP_SECONDS(int64_expression)',
        description: 'Interprets `int64_expression` as the number of seconds since 1970-01-01 00:00:00\nUTC and returns a timestamp.',
        parameters: ['int64_expression'],
      },
    ],
  },
  {
    name: 'timestamp_millis',
    signatures: [
      {
        signature: 'TIMESTAMP_MILLIS(int64_expression)',
        description: 'Interprets `int64_expression` as the number of milliseconds since 1970-01-01\n00:00:00 UTC and returns a timestamp.',
        parameters: ['int64_expression'],
      },
    ],
  },
  {
    name: 'timestamp_micros',
    signatures: [
      {
        signature: 'TIMESTAMP_MICROS(int64_expression)',
        description: 'Interprets `int64_expression` as the number of microseconds since 1970-01-01\n00:00:00 UTC and returns a timestamp.',
        parameters: ['int64_expression'],
      },
    ],
  },
  {
    name: 'unix_seconds',
    signatures: [
      {
        signature: 'UNIX_SECONDS(timestamp_expression)',
        description: 'Returns the number of seconds since 1970-01-01 00:00:00 UTC. Truncates higher\nlevels of precision.',
        parameters: ['timestamp_expression'],
      },
    ],
  },
  {
    name: 'unix_millis',
    signatures: [
      {
        signature: 'UNIX_MILLIS(timestamp_expression)',
        description: 'Returns the number of milliseconds since 1970-01-01 00:00:00 UTC. Truncates\nhigher levels of precision.',
        parameters: ['timestamp_expression'],
      },
    ],
  },
  {
    name: 'unix_micros',
    signatures: [
      {
        signature: 'UNIX_MICROS(timestamp_expression)',
        description: 'Returns the number of microseconds since 1970-01-01 00:00:00 UTC. Truncates\nhigher levels of precision.',
        parameters: ['timestamp_expression'],
      },
    ],
  },
  {
    name: 'timestamp_from_unix_seconds',
    signatures: [
      {
        signature: 'TIMESTAMP_FROM_UNIX_SECONDS(int64_expression)',
        description:
          'Interprets `int64_expression` as the number of seconds since\n1970-01-01 00:00:00 UTC and returns a timestamp. If a timestamp is passed in,\nthe same timestamp is returned.',
        parameters: ['int64_expression'],
      },
    ],
  },
  {
    name: 'timestamp_from_unix_millis',
    signatures: [
      {
        signature: 'TIMESTAMP_FROM_UNIX_MILLIS(int64_expression)',
        description:
          'Interprets `int64_expression` as the number of milliseconds since\n1970-01-01 00:00:00 UTC and returns a timestamp. If a timestamp is passed in,\nthe same timestamp is returned.',
        parameters: ['int64_expression'],
      },
    ],
  },
  {
    name: 'timestamp_from_unix_micros',
    signatures: [
      {
        signature: 'TIMESTAMP_FROM_UNIX_MICROS(int64_expression)',
        description:
          'Interprets `int64_expression` as the number of microseconds since\n1970-01-01 00:00:00 UTC and returns a timestamp. If a timestamp is passed in,\nthe same timestamp is returned.',
        parameters: ['int64_expression'],
      },
    ],
  },
  {
    name: 'make_interval',
    signatures: [
      {
        signature: 'MAKE_INTERVAL(year, month, day, hour, minute, second)',
        description:
          'Constructs an `INTERVAL` object using `INT64` values representing the year,\nmonth, day, hour, minute, and second. All arguments are optional with default\nvalue of 0 and can be used as named arguments.',
        parameters: ['year', 'month', 'day', 'hour', 'minute', 'second'],
      },
    ],
  },
  {
    name: 'justify_days',
    signatures: [
      {
        signature: 'JUSTIFY_DAYS(interval_expression)',
        description:
          'Normalizes the day part of the interval to the range from -29 to 29 by\nincrementing/decrementing the month or year part of the interval.',
        parameters: ['interval_expression'],
      },
    ],
  },
  {
    name: 'justify_hours',
    signatures: [
      {
        signature: 'JUSTIFY_HOURS(interval_expression)',
        description:
          'Normalizes the time part of the interval to the range from -23:59:59.999999 to\n23:59:59.999999 by incrementing/decrementing the day part of the interval.',
        parameters: ['interval_expression'],
      },
    ],
  },
  {
    name: 'justify_interval',
    signatures: [
      {
        signature: 'JUSTIFY_INTERVAL(interval_expression)',
        description: 'Normalizes the days and time parts of the interval.',
        parameters: ['interval_expression'],
      },
    ],
  },
  {
    name: 'session_user',
    signatures: [{ signature: 'SESSION_USER()', description: 'Returns the email address of the user that is running the query.', parameters: [] }],
  },
  {
    name: 'net.ip_from_string',
    signatures: [
      {
        signature: 'NET.IP_FROM_STRING(addr_str)',
        description: 'Converts an IPv4 or IPv6 address from text (STRING) format to binary (BYTES)\nformat in network byte order.',
        parameters: ['addr_str'],
      },
    ],
  },
  {
    name: 'net.safe_ip_from_string',
    signatures: [
      {
        signature: 'NET.SAFE_IP_FROM_STRING(addr_str)',
        description: 'Similar to `NET.IP_FROM_STRING`, but returns `NULL`\ninstead of throwing an error if the input is invalid.',
        parameters: ['addr_str'],
      },
    ],
  },
  {
    name: 'net.ip_to_string',
    signatures: [
      {
        signature: 'NET.IP_TO_STRING(addr_bin)',
        description:
          'Returns a network mask: a byte sequence with length equal to `num_output_bytes`,\nwhere the first `prefix_length` bits are set to 1 and the other bits are set to\n0. `num_output_bytes` and `prefix_length` are INT64.\nThis function throws an error if `num_output_bytes` is not 4 (for IPv4) or 16\n(for IPv6). It also throws an error if `prefix_length` is negative or greater\nthan `8 * num_output_bytes`.',
        parameters: ['addr_bin'],
      },
    ],
  },
  {
    name: 'net.ip_trunc',
    signatures: [
      {
        signature: 'NET.IP_TRUNC(addr_bin, prefix_length)',
        description:
          'Converts an IPv4 address from integer format to binary (BYTES) format in network\nbyte order. In the integer input, the least significant bit of the IP address is\nstored in the least significant bit of the integer, regardless of host or client\narchitecture. For example, `1` means `0.0.0.1`, and `0x1FF` means `0.0.1.255`.',
        parameters: ['addr_bin', 'prefix_length'],
      },
    ],
  },
  {
    name: 'net.ipv4_to_int64',
    signatures: [
      {
        signature: 'NET.IPV4_TO_INT64(addr_bin)',
        description:
          'Converts an IPv4 address from binary (BYTES) format in network byte order to\ninteger format. In the integer output, the least significant bit of the IP\naddress is stored in the least significant bit of the integer, regardless of\nhost or client architecture. For example, `1` means `0.0.0.1`, and `0x1FF` means\n`0.0.1.255`. The output is in the range `[0, 0xFFFFFFFF]`.',
        parameters: ['addr_bin'],
      },
    ],
  },
  {
    name: 'net.ip_in_net',
    signatures: [
      {
        signature: 'NET.IP_IN_NET(address, subnet)',
        description: 'Takes an IP address and a subnet CIDR as STRING and returns true if the IP\naddress is contained in the subnet.',
        parameters: ['address', 'subnet'],
      },
    ],
  },
  {
    name: 'net.make_net',
    signatures: [
      {
        signature: 'NET.MAKE_NET(address, prefix_length)',
        description:
          'Takes an IPv4 or IPv6 address as STRING and an integer representing the prefix\nlength (the number of leading 1-bits in the network mask). Returns a\nSTRING representing the CIDR subnet with the given prefix length.',
        parameters: ['address', 'prefix_length'],
      },
    ],
  },
  {
    name: 'net.host',
    signatures: [
      {
        signature: 'NET.HOST(url)',
        description:
          'Takes a URL as a STRING and returns the host as a STRING. For best results, URL\nvalues should comply with the format as defined by\nRFC 3986. If the URL value does not comply with RFC 3986 formatting,\nthis function makes a best effort to parse the input and return a relevant\nresult. If the function cannot parse the input, it\nreturns NULL.',
        parameters: ['url'],
      },
    ],
  },
  {
    name: 'net.public_suffix',
    signatures: [
      {
        signature: 'NET.PUBLIC_SUFFIX(url)',
        description:
          'Takes a URL as a STRING and returns the public suffix (such as `com`, `org`,\nor `net`) as a STRING. A public suffix is an ICANN domain registered at\npublicsuffix.org. For best results, URL values\nshould comply with the format as defined by\nRFC 3986. If the URL value does not comply\nwith RFC 3986 formatting, this function makes a best effort to parse the input\nand return a relevant result.',
        parameters: ['url'],
      },
    ],
  },
  {
    name: 'net.reg_domain',
    signatures: [
      {
        signature: 'NET.REG_DOMAIN(url)',
        description:
          'Takes a URL as a STRING and returns the registered or registerable domain (the\npublic suffix plus one preceding label), as a\nSTRING. For best results, URL values should comply with the format as defined by\nRFC 3986. If the URL value does not comply with RFC 3986 formatting,\nthis function makes a best effort to parse the input and return a relevant\nresult.',
        parameters: ['url'],
      },
    ],
  },
  {
    name: 'case',
    signatures: [
      {
        signature: 'CASE\n  WHEN condition THEN result\n  [ ... ]\n  [ ELSE else_result ]\n  END',
        description:
          'Evaluates the condition of each successive `WHEN` clause and returns the\nfirst result where the condition is true; any remaining `WHEN` clauses\nand `else_result` are not evaluated. If all conditions are false or NULL,\nreturns `else_result` if present; if not present, returns NULL.',
        parameters: [],
      },
    ],
  },
  {
    name: 'coalesce',
    signatures: [
      {
        signature: 'COALESCE(expr[, ...])',
        description:
          'Returns the value of the first non-null expression. The remaining\nexpressions are not evaluated. An input expression can be any type.\nThere may be multiple input expression types.\nAll input expressions must be implicitly coercible to a common\nsupertype.',
        parameters: [],
      },
    ],
  },
  {
    name: 'if',
    signatures: [
      {
        signature: 'IF(expr, true_result, else_result)',
        description:
          'If `expr` is true, returns `true_result`, else returns `else_result`.\n`else_result` is not evaluated if `expr` is true. `true_result` is not\nevaluated if `expr` is false or NULL.',
        parameters: ['expr', 'true_result', 'else_result'],
      },
    ],
  },
  {
    name: 'ifnull',
    signatures: [
      {
        signature: 'IFNULL(expr, null_result)',
        description: 'If `expr` is NULL, return `null_result`. Otherwise, return `expr`. If `expr`\nis not NULL, `null_result` is not evaluated.',
        parameters: ['expr', 'null_result'],
      },
    ],
  },
  {
    name: 'nullif',
    signatures: [
      {
        signature: 'NULLIF(expr, expr_to_match)',
        description: 'Returns NULL if `expr = expr_to_match` is true, otherwise\nreturns `expr`.',
        parameters: ['expr', 'expr_to_match'],
      },
    ],
  },
  {
    name: 'error',
    signatures: [
      {
        signature: 'ERROR(error_message)',
        description: 'Returns an error. The `error_message` argument is a `STRING`.',
        parameters: ['error_message'],
      },
    ],
  },
  {
    name: 'iferror',
    signatures: [
      {
        signature: 'IFERROR(try_expression, catch_expression)',
        description: 'Evaluates `try_expression`.',
        parameters: ['try_expression', 'catch_expression'],
      },
    ],
  },
  {
    name: 'iserror',
    signatures: [{ signature: 'ISERROR(try_expression)', description: 'Evaluates `try_expression`.', parameters: ['try_expression'] }],
  },
  {
    name: 'nulliferror',
    signatures: [{ signature: 'NULLIFERROR(try_expression)', description: 'Evaluates `try_expression`.', parameters: ['try_expression'] }],
  },
  {
    name: 'concat',
    signatures: [
      {
        signature: 'CONCAT(value1[, ...])',
        description: 'Concatenates one or more values into a single result. All values must be\n`BYTES` or data types that can be cast to `STRING`.',
        parameters: [],
      },
    ],
  },
  {
    name: 'regexp_contains',
    signatures: [
      {
        signature: 'REGEXP_CONTAINS(value, regexp)',
        description: 'Returns `TRUE` if `value` is a partial match for the regular expression,\n`regexp`.',
        parameters: ['value', 'regexp'],
      },
    ],
  },
  {
    name: 'to_base32',
    signatures: [
      {
        signature: 'TO_BASE32(bytes_expr)',
        description:
          'Converts a sequence of `BYTES` into a base32-encoded `STRING`. To convert a\nbase32-encoded `STRING` into `BYTES`, use FROM_BASE32.',
        parameters: ['bytes_expr'],
      },
    ],
  },
  {
    name: 'net.ip_net_mask',
    signatures: [
      {
        signature: 'NET.IP_NET_MASK(num_output_bytes, prefix_length)',
        description:
          'Returns a network mask: a byte sequence with length equal to `num_output_bytes`,\nwhere the first `prefix_length` bits are set to 1 and the other bits are set to\n0. `num_output_bytes` and `prefix_length` are INT64.\nThis function throws an error if `num_output_bytes` is not 4 (for IPv4) or 16\n(for IPv6). It also throws an error if `prefix_length` is negative or greater\nthan `8 * num_output_bytes`.',
        parameters: ['num_output_bytes', 'prefix_length'],
      },
    ],
  },
  {
    name: 'net.ipv4_from_int64',
    signatures: [
      {
        signature: 'NET.IPV4_FROM_INT64(integer_value)',
        description:
          'Converts an IPv4 address from integer format to binary (BYTES) format in network\nbyte order. In the integer input, the least significant bit of the IP address is\nstored in the least significant bit of the integer, regardless of host or client\narchitecture. For example, `1` means `0.0.0.1`, and `0x1FF` means `0.0.1.255`.',
        parameters: ['integer_value'],
      },
    ],
  },
  {
    name: 'anon_avg',
    signatures: [
      {
        signature: 'ANON_AVG(expression [CLAMPED BETWEEN lower AND upper])',
        description:
          'Returns the average of non-`NULL`, non-`NaN` values in the expression.\nThis function first computes the average per anonymization ID, and then computes\nthe final result by averaging these averages.',
        parameters: [],
      },
    ],
  },
  {
    name: 'anon_count',
    signatures: [
      {
        signature: '',
        description:
          'Returns the number of rows in the anonymization-enabled\n`FROM` clause. The final result is an aggregation across anonymization IDs.\nInput values are clamped implicitly. Clamping is performed per\nanonymization ID.',
        parameters: [],
      },
    ],
  },
  {
    name: 'anon_percentile_cont',
    signatures: [
      {
        signature: 'ANON_PERCENTILE_CONT(expression, percentile [CLAMPED BETWEEN lower AND upper])',
        description:
          'Takes an expression and computes a percentile for it. The final result is an\naggregation across anonymization IDs. The percentile must be a literal in the\nrange [0, 1]. You can clamp the input values explicitly,\notherwise input values are clamped implicitly. Clamping is performed per\nanonymization ID.',
        parameters: [],
      },
    ],
  },
  {
    name: 'anon_quantiles',
    signatures: [
      {
        signature: 'ANON_QUANTILES(expression, number CLAMPED BETWEEN lower AND upper)',
        description:
          'Returns an array of anonymized quantile boundaries for values in `expression`.\n`number` represents the number of quantiles to create and must be an\n`INT64`. The first element in the return value is the\nminimum quantile boundary and the last element is the maximum quantile boundary.\n`lower` and `upper` are the explicit bounds wherein the\ninput values are clamped. The returned results are aggregations\nacross anonymization IDs.',
        parameters: ['expression', 'number CLAMPED BETWEEN lower AND upper'],
      },
    ],
  },
  {
    name: 'anon_stddev_pop',
    signatures: [
      {
        signature: 'ANON_STDDEV_POP(expression [CLAMPED BETWEEN lower AND upper])',
        description:
          'Takes an expression and computes the population (biased) standard deviation of\nthe values in the expression. The final result is an aggregation across\nanonymization IDs between `0` and `+Inf`. You can\nclamp the input values explicitly, otherwise input values are\nclamped implicitly. Clamping is performed per individual user values.',
        parameters: [],
      },
    ],
  },
  {
    name: 'anon_sum',
    signatures: [
      {
        signature: 'ANON_SUM(expression [CLAMPED BETWEEN lower AND upper])',
        description:
          'Returns the sum of non-`NULL`, non-`NaN` values in the expression. The final\nresult is an aggregation across anonymization IDs. You can optionally\nclamp the input values. Clamping is performed per\nanonymization ID.',
        parameters: [],
      },
    ],
  },
  {
    name: 'anon_var_pop',
    signatures: [
      {
        signature: 'ANON_VAR_POP(expression [CLAMPED BETWEEN lower AND upper])',
        description:
          'Takes an expression and computes the population (biased) variance of the values\nin the expression. The final result is an aggregation across\nanonymization IDs between `0` and `+Inf`. You can\nclamp the input values explicitly, otherwise input values are\nclamped implicitly. Clamping is performed per individual user values.',
        parameters: [],
      },
    ],
  },
  {
    name: 'to_json_string',
    signatures: [
      {
        signature: 'TO_JSON_STRING(value[, pretty_print])\n',
        description:
          'Takes a SQL value and returns a JSON-formatted string\nrepresentation of the value. The value must be a supported BigQuery\ndata type.',
        parameters: [],
      },
    ],
  },
];
