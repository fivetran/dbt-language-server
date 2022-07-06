export type BigQueryTypeKind =
  | 'TYPE_KIND_UNSPECIFIED'
  | 'INT64'
  | 'BOOL'
  | 'FLOAT64'
  | 'STRING'
  | 'BYTES'
  | 'TIMESTAMP'
  | 'DATE'
  | 'TIME'
  | 'DATETIME'
  | 'INTERVAL'
  | 'GEOGRAPHY'
  | 'NUMERIC'
  | 'BIGNUMERIC'
  | 'JSON'
  | 'ARRAY'
  | 'STRUCT';

export type IStandardSqlDataType = {
  /**
   * The type of the array's elements, if type_kind = "ARRAY".
   */
  arrayElementType?: IStandardSqlDataType;
  /**
   * The fields of this struct, in order, if type_kind = "STRUCT".
   */
  structType?: IStandardSqlStructType;
  /**
   * Required. The top level type of this field. Can be any standard SQL data type (e.g., "INT64", "DATE", "ARRAY").
   */
  typeKind?: BigQueryTypeKind;
};

export type IStandardSqlStructType = { fields?: Array<IStandardSqlField> };

export type IStandardSqlField = {
  /**
   * Optional. The name of this field. Can be absent for struct fields.
   */
  name?: string;
  /**
   * Optional. The type of this parameter. Absent if not explicitly specified (e.g., CREATE FUNCTION statement can omit the return type; in this case the output parameter does not have this "type" field).
   */
  type?: IStandardSqlDataType;
};
