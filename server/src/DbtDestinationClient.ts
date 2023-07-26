import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import { Result } from 'neverthrow';

export interface DbtDestinationClient {
  /**
   * Tests connection to destination
   * @returns Ok in case of connection successful and Err otherwise
   */
  test(): Promise<Result<void, string>>;

  getDatasets(): Promise<Dataset[]>;

  getTables(datasetName: string, projectName?: string): Promise<Table[]>;

  getTableMetadata(datasetName: string, tableName: string): Promise<Metadata | undefined>;

  getUdf(projectId: string | undefined, dataSetId: string, routineId: string): Promise<Udf[]>;

  /** default project (`project` value of BigQuery config, `database` value for Snowflake config) */
  defaultProject: string;
}

export interface Dataset {
  id: string;
}

export interface Table {
  id: string;
}

export interface Metadata {
  schema: SchemaDefinition;
  timePartitioning: boolean;
  type?: string; // BQ: Currently use only EXTERNAL value
}

export interface SchemaDefinition {
  fields: ColumnDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  fields?: ColumnDefinition[];
  mode?: string;
}

export interface Udf {
  nameParts: string[];
  arguments?: UdfArgument[];
  returnType?: TypeProto;
  definitionBody?: string;
}

export interface UdfArgument {
  name?: string;
  type: TypeProto;
  argumentKind?: 'ARGUMENT_KIND_UNSPECIFIED' | 'FIXED_TYPE' | 'ANY_TYPE';
}
